// app/api/inspections/pending/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      },
      include: {
        exporter: true  // Match schema relation name
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Map Prisma Data to Frontend Interface
    const formattedBatches = batches.map(batch => ({
      id: batch.id,
      batch_number: batch.batchNumber,
      exporter_name: batch.exporter.organization || batch.exporter.name,
      crop_type: batch.cropType,
      quantity_kg: batch.quantity,
      location: batch.location,
      destination_country: batch.destinationCountry,
      harvest_date: batch.harvestDate,
      submitted_at: batch.updatedAt,  // Using updatedAt since createdAt isn't in schema
      status: batch.status.toLowerCase(),
      variety: batch.variety,
      unit: batch.unit,
      // Note: labReports and farmPhotos don't exist in your schema
      lab_reports: [],
      farm_photos: []
    }));

    return NextResponse.json(formattedBatches);

  } catch (error: any) {
    console.error("Pending Inspections Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}