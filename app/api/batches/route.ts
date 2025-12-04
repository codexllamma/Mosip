import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      cropType, 
      destinationCountry, 
      harvestDate, 
      location, 
      quantityKg,
      // Default fallback just in case, but frontend should send the real one
      exporterEmail = "contact@bharatexports.com" 
    } = body;

    // 1. Find the SPECIFIC Exporter by Email
    // We changed findFirst -> findUnique to get the exact user
    const exporter = await prisma.user.findUnique({
      where: { email: exporterEmail } 
    });

    if (!exporter) {
      return NextResponse.json({ 
        error: `Exporter account (${exporterEmail}) not found. Please run SQL seeds.` 
      }, { status: 400 });
    }

    // 2. Generate Batch Number
    const batchNumber = `BTH-${Date.now().toString().slice(-6)}`;

    // 3. Create Batch (Using Prisma relations)
    const newBatch = await prisma.batch.create({
      data: {
        batchNumber,
        cropType,
        destinationCountry,
        harvestDate: new Date(harvestDate),
        location,
        quantity: parseFloat(quantityKg),
        unit: 'kg',
        status: 'PENDING',
        labReports: [],
        farmPhotos: [],
        // Connect to the specific ID we found above
        exporter: { connect: { id: exporter.id } }
      }
    });

    // 4. Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'CREATED_BATCH',
        entityType: 'BATCH',
        entityId: newBatch.id,
        actorId: exporter.id,
        details: { batchNumber, cropType }
      }
    });

    return NextResponse.json({ success: true, batch: newBatch });

  } catch (error: any) {
    console.error("Batch Create Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}