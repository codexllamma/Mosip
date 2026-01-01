import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Get the logged-in user's email from query params
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: "Email is required for authorization" }, { status: 400 });
    }

    // 2. Find the User ID for this email
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Fetch Batches filtered by assignedInspectorId
    const batches = await prisma.batch.findMany({
      where: {
        status: {
          in: ['SUBMITTED','PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CERTIFIED']
        },
        // [CRITICAL CHANGE] Only fetch batches assigned to THIS user
        assignedInspectorId: user.id 
      },
      include: {
        exporter: true  
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // 4. Map Prisma Data to Frontend Interface
    const formattedBatches = batches.map(batch => ({
      id: batch.id,
      batch_number: batch.batchNumber,
      exporter_name: batch.exporter.organization || batch.exporter.name,
      crop_type: batch.cropType,
      quantity_kg: batch.quantity,
      location: batch.location,
      destination_country: batch.destinationCountry,
      harvest_date: batch.harvestDate,
      submitted_at: batch.updatedAt,  
      status: batch.status.toLowerCase(),
      variety: batch.variety,
      unit: batch.unit,
      
      // Ensure these match your frontend expectations
      lab_reports: [],
      farm_photos: []
    }));

    return NextResponse.json(formattedBatches);

  } catch (error: any) {
    console.error("Pending Inspections Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}