import { PrismaClient, QAProfile, User } from '@prisma/client';
import { getDistance } from 'geolib';

// Initialize Prisma (Assuming you have a singleton pattern elsewhere, or instantiate here)
// In a real Next.js app, import this from your 'lib/prisma.ts' file
const prisma = new PrismaClient();

// Types for the return object
interface ScoredProfile {
  qa_profile_id: string; // or number, depending on your schema
  qa_name: string;
  distance_km: number | null;
  raw_availability: number;
  score: number;
}

interface MatchResult {
  best: ScoredProfile | null;
  candidates: ScoredProfile[];
  all_scored: ScoredProfile[];
}

// ---------------------------------------------------------
// 1. Geocoder Helper (Replaces geopy.Nominatim)
// ---------------------------------------------------------
// Simple in-memory cache for the runtime of the specific request/server instance
const geoCache: Record<string, { lat: number; lng: number } | null> = {};

async function pinToLatLon(pincode: string | number): Promise<[number, number] | [null, null]> {
  const pinStr = String(pincode).trim();
  
  if (geoCache[pinStr] !== undefined) {
    const cached = geoCache[pinStr];
    return cached ? [cached.lat, cached.lng] : [null, null];
  }

  try {
    // Nominatim requires a User-Agent header
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${pinStr}&country=India&format=json`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'nextjs-exporter-matcher/1.0',
      },
    });

    if (!response.ok) throw new Error('Geocoding fetch failed');

    const data = await response.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      geoCache[pinStr] = { lat, lng };
      return [lat, lng];
    }
  } catch (error) {
    console.error(`Error geocoding pincode ${pinStr}:`, error);
  }

  geoCache[pinStr] = null;
  return [null, null];
}

// ---------------------------------------------------------
// 2. Math Helpers
// ---------------------------------------------------------

function calculateAvailabilityScore(current: number, capacity: number): number {
  if (capacity <= 0) return 0.0;
  let r = current / capacity;
  // Clamp between 0.0 and 1.0
  r = Math.max(0.0, Math.min(1.0, r));
  return 1.0 - r;
}

function normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (max === min) {
    return new Array(values.length).fill(0.5);
  }
  
  return values.map(v => (v - min) / (max - min));
}

// ---------------------------------------------------------
// 3. Main Matching Function
// ---------------------------------------------------------

interface MatchOptions {
  distanceWeight?: number;
  availabilityWeight?: number;
  topK?: number;
}

export async function matchExporterUsingCity(
  pincode: number | string,
  testsToBeDone: string[],
  options: MatchOptions = {}
): Promise<MatchResult> {
  const {
    distanceWeight = 0.7,
    availabilityWeight = 0.3,
    topK = 5
  } = options;

  // 1. Geocode the origin (Batch location)
  const [originLat, originLng] = await pinToLatLon(pincode);
  
  if (originLat === null || originLng === null) {
    console.error(`Error: Could not geocode origin pincode ${pincode}`);
    return { best: null, candidates: [], all_scored: [] };
  }

  // 2. Fetch Active QAs
  const allActiveProfiles = await prisma.qAProfile.findMany({
    where: { active: true },
    include: { user: true },
  });

  // 3. Filter in memory 
  const qaProfiles = allActiveProfiles.filter((p) => {
    // Cast to 'any' to handle the JSON object structure safely
    const rawTests = (p as any).testsAvailable || {};

    // Logic: Check if the required test exists as a KEY in the object and is TRUE
    // Example: if rawTests is { moisture: true }, we check rawTests["moisture"]
    return testsToBeDone.every((testName) => {
      return rawTests[testName] === true;
    });
  });

  if (qaProfiles.length === 0) {
    return { best: null, candidates: [], all_scored: [] };
  }

  // 4. Compute raw metrics
  type RawEntry = {
    profile: typeof qaProfiles[0];
    distanceKm: number;
    rawAvail: number;
  };

  const rawEntries: RawEntry[] = [];

  for (const p of qaProfiles) {
    const profileData = p as any; // Cast for flexible access
    let qaLat = p.latitude;
    let qaLng = p.longitude;

    // Logic: If coords missing, fetch via Pincode and UPDATE DB
    if (!qaLat || !qaLng) {
      const qaPin = profileData.pinCode || profileData.pincode; 
      
      const [newLat, newLng] = await pinToLatLon(qaPin);
      
      if (newLat !== null && newLng !== null) {
        qaLat = newLat;
        qaLng = newLng;
        // Async update
        await prisma.qAProfile.update({
          where: { id: p.id },
          data: { latitude: newLat, longitude: newLng },
        });
      }
    }

    // Calculate Distance
    let distKm = Infinity;
    if (qaLat !== null && qaLng !== null) {
      const distMeters = getDistance(
        { latitude: originLat, longitude: originLng },
        { latitude: qaLat, longitude: qaLng }
      );
      distKm = distMeters / 1000;
    }

    // Calculate Availability
    const currentLoad = profileData.currentLoad ?? 0;
    const maxCapacity = profileData.maxCapacity ?? 1;
    const rawAvail = calculateAvailabilityScore(currentLoad, maxCapacity);

    rawEntries.push({
      profile: p,
      distanceKm: distKm,
      rawAvail: rawAvail,
    });
  }

  // 5. Handle Infinity / Normalization prep
  const finiteDistances = rawEntries
    .map(e => e.distanceKm)
    .filter(d => d !== Infinity);
    
  const maxDist = finiteDistances.length > 0 
    ? Math.max(...finiteDistances) * 2 
    : 1000.0;

  const distList = rawEntries.map(e => (e.distanceKm === Infinity ? maxDist : e.distanceKm));
  const availList = rawEntries.map(e => e.rawAvail);

  // 6. Normalize
  const dNorm = normalize(distList);
  const aNorm = normalize(availList);

  // 7. Final Scoring
  const scored: ScoredProfile[] = rawEntries.map((entry, i) => {
    const score = (distanceWeight * dNorm[i]) + (availabilityWeight * (1.0 - aNorm[i]));

    return {
      qa_profile_id: entry.profile.id,
      qa_name: entry.profile.user ? entry.profile.user.name : "Unknown",
      distance_km: entry.distanceKm === Infinity ? null : entry.distanceKm,
      raw_availability: entry.rawAvail,
      score: parseFloat(score.toFixed(4)),
    };
  });

  scored.sort((a, b) => a.score - b.score);

  return {
    best: scored.length > 0 ? scored[0] : null,
    candidates: scored.slice(0, topK),
    all_scored: scored,
  };
}