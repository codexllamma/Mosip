// app/api/batches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
import { matchExporterUsingCity } from "@/lib/matchingService";

// Mock Session (Temporarily use a mock user ID if NextAuth session is complex)
const MOCK_EXPORTER_EMAIL = "contact@bharatexports.com";

// --- GET Handler: Fetch Batches for the Exporter ---
export async function GET(req: NextRequest) {
    try {
        // --- TEMPORARY MOCK AUTH for development ---
        const exporter = await prisma.user.findUnique({
            where: { email: MOCK_EXPORTER_EMAIL },
        });

        if (!exporter) {
             return NextResponse.json({ message: "Mock Exporter not found" }, { status: 404 });
        }
        const exporterId = exporter.id;
        
        // 2. Fetch Batches related to this exporterId
        const batches = await prisma.batch.findMany({
            where: {
                exporterId: exporterId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                assignedInspector: true // Include inspector details so frontend shows who is assigned
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
          tests 
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
        // We start as SUBMITTED, and only move to PENDING_APPROVAL if matching succeeds
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

        // 3. Auto-Assign Logic (The "Matching" Step)
        console.log(`Running matching logic for Batch ${batchNumber} at Pincode ${pinCode}...`);
        
        try {
            // Call the matching service directly
            const matchResult = await matchExporterUsingCity(parseInt(pinCode), tests || []);
            
            if (matchResult.best) {
                console.log(`Best match found: ${matchResult.best.qa_name} (Score: ${matchResult.best.score})`);

                // We have the QAProfile ID, we need the User ID to link it in the Batch table
                const qaProfile = await prisma.qAProfile.findUnique({
                    where: { id: matchResult.best.qa_profile_id },
                    include: { user: true }
                });

                if (qaProfile && qaProfile.user) {
                    // 4. Update Batch -> Assigned & Pending Approval
                    newBatch = await prisma.batch.update({
                        where: { id: newBatch.id },
                        data: {
                            assignedInspectorId: qaProfile.user.id, // Link User ID
                            status: 'PENDING_APPROVAL' // Change Status
                        }
                    });
                    
                    // Log the assignment
                    await prisma.auditLog.create({
                        data: {
                            action: 'Assigned',
                            entityType: 'Batch',
                            entityId: newBatch.id,
                            actorId: 'SYSTEM', // System automated action
                            details: { 
                                inspector: qaProfile.user.name, 
                                matchScore: matchResult.best.score 
                            }
                        }
                    });
                }
            } else {
                console.warn("No suitable inspector found for batch assignment.");
                // Status remains 'SUBMITTED', admins can manually assign later if needed
            }
        } catch (matchError) {
            console.error("Matching Logic Failed:", matchError);
            // We don't fail the request, just log it. The batch is created anyway.
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