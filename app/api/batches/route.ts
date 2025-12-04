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
      exporterEmail = "contact@bharatexports.com" 
    } = body;

    // 1. Find or CREATE the exporter
    let exporter = await prisma.user.findUnique({
      where: { email: exporterEmail } 
    });

    // If exporter doesn't exist, create them automatically
    if (!exporter) {
      exporter = await prisma.user.create({
        data: {
          email: exporterEmail,
          name: exporterEmail.split('@')[0], // Use email prefix as name
          role: 'EXPORTER',
        }
      });
      console.log('✅ Created new exporter:', exporter.email);
    }

    // 2. Generate Batch Number
    const batchNumber = `BTH-${Date.now().toString().slice(-6)}`;

    // 3. Create Batch
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