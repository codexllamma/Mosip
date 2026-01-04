// app/api/batches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
import { matchExporterUsingCity, MatchOptions, MatchResult } from "@/lib/matchingService";

// Mock Session
const MOCK_EXPORTER_EMAIL = "contact@bharatexports.com";

export async function GET(req: NextRequest) {
    console.log("[BATCH_API] GET request initiated");
    try {
        const exporter = await prisma.user.findUnique({
            where: { email: MOCK_EXPORTER_EMAIL },
        });

        if (!exporter) {
            console.error(`[BATCH_API] GET: Mock Exporter (${MOCK_EXPORTER_EMAIL}) not found`);
            return NextResponse.json({ message: "Mock Exporter not found" }, { status: 404 });
        }
        
        const batches = await prisma.batch.findMany({
            where: { exporterId: exporter.id },
            orderBy: { createdAt: 'desc' },
            include: { assignedInspector: true }
        });

        return NextResponse.json(batches, { status: 200 });
    } catch (error) {
        console.error("[BATCH_API] GET Error:", error);
        return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    console.log("[BATCH_API] POST request initiated");
    try {
        const body = await req.json();
        console.log("[BATCH_API] Incoming Request Body:", JSON.stringify(body, null, 2));

        // FIXED: Destructuring 'pincode' (lowercase 'c') to match your JSON payload
        const { 
          cropType, 
          destinationCountry, 
          harvestDate, 
          location, 
          quantity,
          unit,
          exporterEmail = MOCK_EXPORTER_EMAIL,
          variety,
          pincode, // Changed from pinCode to match your logs
          tests,
          golden = false 
        } = body;

        // 1. Find or Create Exporter
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
        
        const batchNumber = `BTH-${Date.now().toString().slice(-6)}`;

        // 2. Create Batch
        console.log(`[BATCH_API] Step 2: Creating batch ${batchNumber}. Pincode detected: ${pincode}`);
        
        let newBatch = await prisma.batch.create({
          data: {
            batchNumber,
            cropType,
            destinationCountry,
            harvestDate: new Date(harvestDate),
            location,
            quantity: parseFloat(quantity),
            unit: unit || 'kg',
            variety: variety || 'Grade A',
            // FIXED: Ensure pinCode is a number and not NaN
            pinCode: parseInt(pincode) || 0, 
            status: 'SUBMITTED', 
            tests: tests || [],
            exporter: { connect: { id: exporter.id } }
          }
        });

        // 3. Auto-Assign Logic
        try {
            const matchOptions: MatchOptions = {
                distanceWeight: 0.7,
                availabilityWeight: 0.3,
                topK: 6
            };

            // Use the parsed pincode here
            const matchResult = await matchExporterUsingCity(
                parseInt(pincode) || 0,         
                tests || [],      
                golden,           
                matchOptions      
            );
            
            if (matchResult?.qaAgencies?.length > 0) {
                const bestMatch = matchResult.qaAgencies[0];
                const qaProfile = await prisma.qAProfile.findUnique({
                    where: { id: bestMatch.qa_profile_id },
                    include: { user: true }
                });

                if (qaProfile?.user) {
                    newBatch = await prisma.batch.update({
                        where: { id: newBatch.id },
                        data: {
                            assignedInspectorId: qaProfile.user.id,
                            status: 'PENDING_APPROVAL' 
                        }
                    });
                    
                    await prisma.auditLog.create({
                        data: {
                            action: 'Assigned',
                            entityType: 'Batch',
                            entityId: newBatch.id,
                            actorId: 'SYSTEM',
                            details: { inspector: qaProfile.user.name, score: bestMatch.score }
                        }
                    });
                }
            }
        } catch (matchError) {
            console.error("[BATCH_API] Assignment Logic Failed (Non-fatal):", matchError);
        }

        // 4. Final Audit Log
        await prisma.auditLog.create({
          data: {
            action: 'Created',
            entityType: 'Batch',
            entityId: newBatch.id,
            actorId: exporter.id,
            details: { batchNumber, cropType }
          }
        });

        return NextResponse.json(newBatch, { status: 201 });

    } catch (error: any) {
        console.error("[BATCH_API] POST Error:", error);
        return NextResponse.json({ 
            message: "Failed to create batch", 
            error: error.message 
        }, { status: 500 });
    }
}