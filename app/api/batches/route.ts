// app/api/batches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
import { matchExporterUsingCity, MatchOptions } from "@/lib/matchingService";

// Mock Session
const MOCK_EXPORTER_EMAIL = "contact@bharatexports.com";

export async function GET(req: NextRequest) {
    console.log("[BATCH_API] GET request initiated");
    try {
        const exporter = await prisma.user.findUnique({
            where: { email: MOCK_EXPORTER_EMAIL },
        });

        if (!exporter) {
            return NextResponse.json({ message: "Mock Exporter not found" }, { status: 404 });
        }
        
        const batches = await prisma.batch.findMany({
            where: { exporterId: exporter.id },
            orderBy: { createdAt: 'desc' },
            include: { inspections: { include: { inspector: true } } }
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

        const { 
          cropType, 
          destinationCountry, 
          harvestDate, 
          location, 
          quantity,
          unit,
          exporterEmail = MOCK_EXPORTER_EMAIL,
          variety,
          pincode, 
          tests,
          golden  
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

        // 2. Create Batch (Initial State)
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

            const matchResult = await matchExporterUsingCity(
                parseInt(pincode) || 0,         
                tests || [],      
                golden,           
                matchOptions      
            );
            
            const agenciesToAssign = matchResult.qaAgencies || [];
            
            if (agenciesToAssign.length > 0) {
                console.log(`[BATCH_API] Assigning ${agenciesToAssign.length} inspectors (Golden: ${golden})`);

                // A. Create Inspections
                await Promise.all(agenciesToAssign.map(async (agency) => {
                    const qaProfile = await prisma.qAProfile.findUnique({
                        where: { id: agency.qa_profile_id },
                        include: { user: true }
                    });

                    if (qaProfile?.user) {
                        await prisma.inspection.create({
                            data: {
                                batchId: newBatch.id,
                                inspectorId: qaProfile.user.id,
                                status: 'PENDING',
                            }
                        });
                        
                        await prisma.auditLog.create({
                            data: {
                                action: 'Assigned',
                                entityType: 'Batch',
                                entityId: newBatch.id,
                                actorId: 'SYSTEM',
                                details: { inspector: qaProfile.user.name, score: agency.score, type: golden ? "Golden Consensus" : "Standard" }
                            }
                        });
                    }
                }));

                // B. FIXED: Fetch the valid User ID for the primary inspector
                // 'agency.qa_profile_id' is a Profile UUID, we need the User UUID.
                const primaryProfile = await prisma.qAProfile.findUnique({
                    where: { id: agenciesToAssign[0].qa_profile_id },
                    select: { userId: true } // Only fetch the User ID
                });

                if (primaryProfile && primaryProfile.userId) {
                    newBatch = await prisma.batch.update({
                        where: { id: newBatch.id },
                        data: {
                            status: 'PENDING_APPROVAL',
                            // Now using the correct User ID
                            assignedInspectorId: primaryProfile.userId 
                        }
                    });
                }
            } else {
                 console.warn("[BATCH_API] No matching agencies found.");
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
            details: { batchNumber, cropType, golden }
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