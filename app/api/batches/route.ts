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
      quantity, // Changed from quantityKg
      unit,     // Added unit
      exporterEmail = "contact@bharatexports.com",
      labReports = [], 
      farmPhotos = []  
    } = body;

    
    let exporter = await prisma.user.findUnique({
      where: { email: exporterEmail } 
    });

    if (!exporter) {
      exporter = await prisma.user.create({
        data: {
          email: exporterEmail,
          name: exporterEmail.split('@')[0],
          role: 'EXPORTER',
        }
      });
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
        quantity: parseFloat(quantity), // Ensure it's a float
        unit: unit || 'kg',
        status: 'PENDING',
        labReports: labReports, // Storing URLs
        farmPhotos: farmPhotos, // Storing URLs
        exporter: { connect: { id: exporter.id } }
      }
    });

    // 4. Audit Log
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