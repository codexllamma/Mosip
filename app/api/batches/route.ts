// app/api/batches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
import { matchExporterUsingCity, MatchOptions,MatchResult } from "@/lib/matchingService";

// Mock Session
const MOCK_EXPORTER_EMAIL = "contact@bharatexports.com";

// --- GET Handler: Fetch Batches for the Exporter ---
export async function GET(req: NextRequest) {
    try {
        const exporter = await prisma.user.findUnique({
            where: { email: MOCK_EXPORTER_EMAIL },
        });

        if (!exporter) {
             return NextResponse.json({ message: "Mock Exporter not found" }, { status: 404 });
        }
        
        const batches = await prisma.batch.findMany({
            where: {
                exporterId: exporter.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                assignedInspector: true 
            }
        });

        return NextResponse.json(batches, { status: 200 });

    } catch (error) {
        console.error("Batch GET Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

// --- POST Handler: Create Batch & Auto-Assign Inspector ---
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
          cropType, 
          destinationCountry, 
          harvestDate, 
          location, 
          quantity,
          unit,
          exporterEmail = MOCK_EXPORTER_EMAIL,
          variety = "Grade A",
          pinCode = "400092",
          tests,
          golden = false // Added golden from body, defaults to false
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

        // 2. Create Batch (Initial Status: SUBMITTED)
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
            pinCode: parseInt(pinCode),
            status: 'SUBMITTED', 
            tests: tests || [],
            exporter: { connect: { id: exporter.id } }
          }
        });

        // 3. Auto-Assign Logic (Updated to match function definition)
        console.log(`Running matching logic for Batch ${batchNumber} at Pincode ${pinCode}...`);
        
        try {
            // Define Match Options based on your intended implementation
            const matchOptions: MatchOptions = {
                distanceWeight: 0.7,
                availabilityWeight: 0.3,
                topK: 6
            };

            // CORRECTED CALL: Included 'golden' and 'matchOptions'
            const matchResult = await matchExporterUsingCity(
                pinCode,         // pincode
                tests || [],      // testsToBeDone
                golden,           // golden (boolean)
                matchOptions      // options (MatchOptions)
            );
            
            if (matchResult.qaAgencies) {
                console.log(`Best match found: ${matchResult.qaAgencies[0].qa_name} (Score: ${matchResult.qaAgencies[0].score})`);

                const qaProfile = await prisma.qAProfile.findUnique({
                    where: { id: matchResult.qaAgencies[0].qa_profile_id },
                    include: { user: true }
                });

                if (qaProfile && qaProfile.user) {
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
                            details: { 
                                inspector: qaProfile.user.name, 
                                matchScore: matchResult.qaAgencies[0].score 
                            }
                        }
                    });
                }
            } else {
                console.warn("No suitable inspector found for batch assignment.");
            }
        } catch (matchError) {
            console.error("Matching Logic Failed:", matchError);
        }

        // 5. Initial Audit Log (Creation)
        await prisma.auditLog.create({
          data: {
            action: 'Created',
            entityType: 'Batch',
            entityId: newBatch.id,
            actorId: exporter.id,
            details: { batchNumber, cropType, tests }
          }
        });

        return NextResponse.json(newBatch, { status: 201 });

    } catch (error: any) {
        console.error("Batch Create Error:", error);
        return NextResponse.json({ message: "Failed to create batch" }, { status: 500 });
    }
}
