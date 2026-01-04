// app/api/batches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
import { matchExporterUsingCity, MatchOptions, MatchResult } from "@/lib/matchingService";

// Mock Session
const MOCK_EXPORTER_EMAIL = "contact@bharatexports.com";

// --- GET Handler: Fetch Batches for the Exporter ---
export async function GET(req: NextRequest) {
    console.log("[BATCH_API] GET request initiated");
    try {
        const exporter = await prisma.user.findUnique({
            where: { email: MOCK_EXPORTER_EMAIL },
        });

        if (!exporter) {
            console.error(`[BATCH_API] GET: Mock Exporter (${MOCK_EXPORTER_EMAIL}) not found in DB`);
            return NextResponse.json({ message: "Mock Exporter not found" }, { status: 404 });
        }
        
        console.log(`[BATCH_API] GET: Fetching batches for exporter ID: ${exporter.id}`);
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

        console.log(`[BATCH_API] GET: Successfully retrieved ${batches.length} batches`);
        return NextResponse.json(batches, { status: 200 });

    } catch (error) {
        console.error("[BATCH_API] GET Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

// --- POST Handler: Create Batch & Auto-Assign Inspector ---
export async function POST(req: NextRequest) {
    console.log("[BATCH_API] POST request initiated");
    try {
        const body = await req.json();
        console.log("[BATCH_API] Request Body:", JSON.stringify(body, null, 2));

        const { 
          cropType, 
          destinationCountry, 
          harvestDate, 
          location, 
          quantity,
          unit,
          exporterEmail = MOCK_EXPORTER_EMAIL,
          variety,
          pinCode,
          tests,
          golden = false 
        } = body;

        // 1. Find or Create Exporter
        console.log(`[BATCH_API] Step 1: Locating/Creating exporter for ${exporterEmail}`);
        let exporter = await prisma.user.findUnique({
            where: { email: exporterEmail } 
        });

        if (!exporter) {
          console.log("[BATCH_API] Exporter not found, creating new user record...");
          exporter = await prisma.user.create({
            data: {
              email: exporterEmail,
              name: exporterEmail.split('@')[0],
              role: 'EXPORTER',
            }
          });
          console.log(`[BATCH_API] New exporter created: ${exporter.id}`);
        }
        
        const batchNumber = `BTH-${Date.now().toString().slice(-6)}`;

        // 2. Create Batch
        console.log(`[BATCH_API] Step 2: Creating batch record ${batchNumber}`);
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
        console.log(`[BATCH_API] Batch created successfully. ID: ${newBatch.id}`);

        // 3. Auto-Assign Logic
        console.log(`[BATCH_API] Step 3: Running matching logic. Pincode: ${pinCode}, Golden: ${golden}`);
        
        try {
            const matchOptions: MatchOptions = {
                distanceWeight: 0.7,
                availabilityWeight: 0.3,
                topK: 6
            };

            const matchResult = await matchExporterUsingCity(
                pinCode,         
                tests || [],      
                golden,           
                matchOptions      
            );
            
            console.log("[BATCH_API] Matching logic result:", JSON.stringify(matchResult, null, 2));

            if (matchResult && matchResult.qaAgencies && matchResult.qaAgencies.length > 0) {
                const bestMatch = matchResult.qaAgencies[0];
                console.log(`[BATCH_API] Best match found: ${bestMatch.qa_name} (Score: ${bestMatch.score})`);

                const qaProfile = await prisma.qAProfile.findUnique({
                    where: { id: bestMatch.qa_profile_id },
                    include: { user: true }
                });

                if (qaProfile && qaProfile.user) {
                    console.log(`[BATCH_API] Assigning Inspector ${qaProfile.user.name} (ID: ${qaProfile.user.id}) to Batch`);
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
                                matchScore: bestMatch.score 
                            }
                        }
                    });
                    console.log("[BATCH_API] Assignment and Audit Log updated successfully");
                } else {
                    console.warn("[BATCH_API] QA Profile found in match results but not found in Database!");
                }
            } else {
                console.warn("[BATCH_API] No suitable inspector found for batch assignment. matchResult.qaAgencies was empty/null.");
            }
        } catch (matchError) {
            console.error("[BATCH_API] CRITICAL: Matching Logic internal failure:", matchError);
            // We don't throw here so the batch creation isn't rolled back just because matching failed
        }

        // 5. Initial Audit Log (Creation)
        console.log("[BATCH_API] Step 4: Creating initial creation Audit Log");
        await prisma.auditLog.create({
          data: {
            action: 'Created',
            entityType: 'Batch',
            entityId: newBatch.id,
            actorId: exporter.id,
            details: { batchNumber, cropType, tests }
          }
        });

        console.log("[BATCH_API] POST process completed successfully");
        return NextResponse.json(newBatch, { status: 201 });

    } catch (error: any) {
        console.error("[BATCH_API] POST Error:", error);
        return NextResponse.json({ 
            message: "Failed to create batch", 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
    }
}