import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Batch } from "@/types";

export const dynamic = 'force-dynamic'; // Ensure it doesn't cache statically

export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      },
      include: {
        exporter: true // Include exporter details
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Map Prisma Data (camelCase) to Frontend Interface (snake_case)
    const formattedBatches = batches.map(batch => ({
      id: batch.id,
      batch_number: batch.batchNumber,
      exporter_name: batch.exporter.organization || batch.exporter.name,
      crop_type: batch.cropType,
      quantity_kg: batch.quantity,
      location: batch.location,
      destination_country: batch.destinationCountry,
      harvest_date: batch.harvestDate,
      submitted_at: batch.createdAt,
      status: batch.status.toLowerCase(), // 'PENDING' -> 'pending'
      lab_reports: batch.labReports,
      farm_photos: batch.farmPhotos
    }));

    return NextResponse.json(formattedBatches);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}