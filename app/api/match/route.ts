// app/api/match/route.ts
import { NextResponse } from 'next/server';
import { matchExporterUsingCity } from '@/lib/matchingService'; // Adjust path

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pincode, tests } = body;

    if (!pincode || !tests) {
      return NextResponse.json(
        { error: 'Missing pincode or tests' },
        { status: 400 }
      );
    }

    const results = await matchExporterUsingCity(pincode, tests, {
      distanceWeight: 0.7,
      availabilityWeight: 0.3,
      topK: 6
    });

    return NextResponse.json(results);
    
  } catch (error) {
    console.error("Matching error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}