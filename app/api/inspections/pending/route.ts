import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Force dynamic to prevent caching issues with searchParams
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Find the Inspector by Email
    const inspector = await prisma.user.findFirst({
      where: { email: email }
    });

    if (!inspector) {
      return NextResponse.json([]); 
    }

    // 2. Find PENDING inspections assigned to this inspector
    const assignments = await prisma.inspection.findMany({
      where: {
        inspectorId: inspector.id,
        status: { not: 'COMPLETED' }
      },
      include: {
        batch: {
          include: {
            exporter: true
          }
        }
      },
      // FIX: Sort by the BATCH's creation date, since Inspection doesn't have 'createdAt'
      orderBy: {
        batch: {
          createdAt: 'desc'
        }
      }
    });

    // 3. Transform data
    const formattedData = assignments.map((inspection: any) => ({
      id: inspection.batch.id, 
      batch_number: inspection.name,
      exporter_name: inspection.batch.exporter?.organization || inspection.batch.exporter?.name || "Unknown Exporter",
      crop_type: inspection.batch.cropType,
      quantity_kg: inspection.batch.quantity, 
      location: inspection.batch.location,
      submitted_at: inspection.batch.createdAt,
      status: inspection.status 
    }));

    return NextResponse.json(formattedData);

  } catch (error: any) {
    console.error("[PENDING_INSPECTIONS_API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}