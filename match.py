# match_by_city.py
import functools
import math
from typing import List, Optional, Tuple, Dict, Any

from prisma import Prisma
from geopy.geocoders import Nominatim
from geopy.distance import geodesic

# --- geocoder + cache (synchronous geopy used inside async code, that's fine) ---
geolocator = Nominatim(user_agent="exporter-qa-matcher")

@functools.lru_cache(maxsize=2048)
def geocode_cache(address: str) -> Optional[Tuple[float, float]]:
    """Return (lat,lng) or None. Cached to reduce external calls."""
    try:
        loc = geolocator.geocode(address, exactly_one=True, timeout=10)
        if loc:
            return (loc.latitude, loc.longitude)
    except Exception:
        return None
    return None

def distance_km_from_coords(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    return geodesic(a, b).km

def availability_score(current: int, capacity: int) -> float:
    if capacity <= 0:
        return 0.0
    r = current / capacity
    r = max(0.0, min(1.0, r))
    return 1.0 - r

def normalize(values: List[float]) -> List[float]:
    if not values:
        return []
    mn = min(values)
    mx = max(values)
    if mx == mn:
        return [0.5] * len(values)
    return [(v - mn) / (mx - mn) for v in values]

# ---------------------------
# MAIN ASYNC MATCH FUNCTION
# ---------------------------
async def match_exporter_using_city(
    db: Prisma,
    exporter_address: str,
    exporter_city: str,
    exporter_lat: Optional[float] = None,
    exporter_lng: Optional[float] = None,
    *,
    distance_weight: float = 0.7,
    availability_weight: float = 0.3,
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    - db: initialized & connected Prisma client
    - exporter_address: full exporter address string (used for geocoding if coords not provided)
    - exporter_city: city string used to filter QA profiles
    - exporter_lat, exporter_lng: optional; if provided, used directly (faster)
    Returns a dict:
    {
      "best": {...},
      "candidates": [{...}, ... up to top_k],
      "all_scored": [... ranked ...]
    }
    Each candidate: {
      "qa_profile_id", "qa_user_id", "qa_name",
      "distance_km", "availability_norm", "score",
      "raw_avail"  # 1..0 availability raw
    }
    """
    # 1) obtain exporter coordinates (prefer provided lat/lng)
    exporter_coords = None
    if exporter_lat is not None and exporter_lng is not None:
        exporter_coords = (exporter_lat, exporter_lng)
    else:
        exporter_coords = geocode_cache(exporter_address)
        if exporter_coords is None:
            raise ValueError("Unable to geocode exporter address; provide lat/lng or valid address")

    # 2) fetch QA profiles in same city (address contains city, case-insensitive)
    # Adjust the model accessor if your generated client differs (e.g., db.qa_profile)
    qa_profiles = await db.qAProfile.find_many(
        where={
            "active": True,
            "address": {
                "contains": exporter_city,
                "mode": "insensitive"
            }
        },
        include={"user": True}
    )

    if not qa_profiles:
        return {"best": None, "candidates": [], "all_scored": []}

    # 3) compute distance and availability for each QA
    scored = []
    distances_for_norm = []
    avail_for_norm = []
    raw_entries = []

    for p in qa_profiles:
        # p may have lat/lng fields (named according to your prisma model, e.g., lat, lng)
        coords = None
        if getattr(p, "lat", None) is not None and getattr(p, "lng", None) is not None:
            coords = (float(p.lat), float(p.lng))
        else:
            coords = geocode_cache(p.address)

        if coords is None:
            # mark as very far; we'll convert to a large finite value for normalization later
            distance_km = None
            distances_for_norm.append(float("inf"))
        else:
            distance_km = distance_km_from_coords(exporter_coords, coords)
            distances_for_norm.append(distance_km)

        raw_avail = availability_score(p.currentLoad if hasattr(p, "currentLoad") else p.current_load,
                                      p.maxCapacity if hasattr(p, "maxCapacity") else p.max_capacity)
        avail_for_norm.append(raw_avail)

        raw_entries.append({
            "profile": p,
            "user": p.user,
            "distance_km": distance_km,
            "raw_avail": raw_avail
        })

    # 4) normalize distances: replace inf with large finite (based on max finite distance)
    finite = [d for d in distances_for_norm if math.isfinite(d)]
    if finite:
        max_finite = max(finite)
        large = max_finite * 10 + 1000.0
    else:
        large = 1e9

    distances_clean = [d if math.isfinite(d) else large for d in distances_for_norm]

    dist_norm = normalize(distances_clean)  # lower is better
    avail_norm = normalize(avail_for_norm)  # higher is better

    # 5) compute score and assemble candidate list
    for idx, entry in enumerate(raw_entries):
        d_raw = entry["distance_km"]
        d_n = dist_norm[idx]
        a_raw = entry["raw_avail"]
        a_n = avail_norm[idx]
        score = distance_weight * d_n + availability_weight * (1.0 - a_n)

        scored.append({
            "qa_profile_id": entry["profile"].id,
            "qa_user_id": entry["user"].id,
            "qa_name": entry["user"].name,
            "distance_km": d_raw,
            "raw_availability": a_raw,
            "availability_norm": a_n,
            "score": score
        })

    # 6) sort ascending by score (lower is better)
    scored.sort(key=lambda x: x["score"])

    best = scored[0] if scored else None
    candidates = scored[:top_k]

    return {"best": best, "candidates": candidates, "all_scored": scored}
