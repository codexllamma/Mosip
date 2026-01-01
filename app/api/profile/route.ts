// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pinToLatLon } from "@/lib/matchingService"; // <--- Import your existing function

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, role, data } = body;

    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Handle QA AGENCY Profile
    if (role === 'QA_AGENCY') {
      const { address, pinCode, maxCapacity, testsAvailable } = data;
      
      // 1. Resolve Coordinates using your lib function
      let lat: number | null = null;
      let lng: number | null = null;

      if (pinCode) {
         console.log(`Resolving coordinates for Pincode: ${pinCode}`);
         const [resolvedLat, resolvedLng] = await pinToLatLon(pinCode);
         lat = resolvedLat;
         lng = resolvedLng;
         
         if(lat && lng) console.log(`Location found: ${lat}, ${lng}`);
         else console.warn(`Could not geocode pincode: ${pinCode}`);
      }

      // 2. Save to DB
      const profile = await prisma.qAProfile.upsert({
        where: { userId: user.id },
        update: {
          address,
          pinCode: parseInt(pinCode),
          maxCapacity: parseInt(maxCapacity),
          testsAvailable: testsAvailable || {},
          active: true,
          // Update coordinates
          latitude: lat,
          longitude: lng,
        },
        create: {
          userId: user.id,
          address,
          pinCode: parseInt(pinCode),
          maxCapacity: parseInt(maxCapacity),
          testsAvailable: testsAvailable || {},
          active: true,
          // Insert coordinates
          latitude: lat,
          longitude: lng,
        }
      });
      return NextResponse.json({ success: true, profile });
    }

    // Handle EXPORTER Profile (Standard save, no geo needed usually)
    if (role === 'EXPORTER') {
      const { iecNum, address, city, phoneNum, country, panNum, gstNum } = data;

      const profile = await prisma.exporter.upsert({
        where: { userId: user.id },
        update: {
          iecNum: BigInt(iecNum),
          address,
          city,
          phoneNum: BigInt(phoneNum),
          country,
          panNum,
          gstNum
        },
        create: {
          userId: user.id,
          iecNum: BigInt(iecNum),
          address,
          city,
          phoneNum: BigInt(phoneNum),
          country,
          panNum,
          gstNum
        }
      });
      
      // BigInt serialization fix
      const serialized = JSON.parse(JSON.stringify(profile, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
      
      return NextResponse.json({ success: true, profile: serialized });
    }

    return NextResponse.json({ error: "Invalid Role" }, { status: 400 });

  } catch (error: any) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { qaProfile: true, exporter: true }
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let profile = null;
  let isComplete = false;

  if (user.role === 'QA_AGENCY') {
    profile = user.qaProfile;
    isComplete = !!(profile && profile.address && profile.pinCode);
  } else if (user.role === 'EXPORTER') {
    profile = user.exporter;
    isComplete = !!(profile && profile.iecNum);
  }

  const serializedProfile = profile ? JSON.parse(JSON.stringify(profile, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  )) : null;

  return NextResponse.json({ isComplete, profile: serializedProfile, role: user.role });
}