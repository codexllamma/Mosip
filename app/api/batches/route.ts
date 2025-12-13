// app/api/batches/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; 
// Assuming you have a way to import session logic (e.g., from your auth options)
// import { getServerSession } from "next-auth/next"; 
// import { authOptions } from "@/lib/auth"; // <--- Replace with your actual path to Auth options

// Mock Session (Temporarily use a mock user ID if NextAuth session is complex)
const MOCK_EXPORTER_ID = "clsgv6l5k000000ux1b9t9t8h"; // Replace with a real Exporter ID from your DB
const MOCK_EXPORTER_EMAIL = "contact@bharatexports.com";

// --- GET Handler: Fetch Batches for the Exporter ---
export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate & Get User ID
        // const session = await getServerSession(req, {
        //   ...req.headers
        // }, authOptions);

        // if (!session || !session.user || !session.user.id) {
        //   return NextResponse.json({ message: "Authentication required" }, { status: 401 });
        // }
        // const exporterId = session.user.id;

        // --- TEMPORARY MOCK AUTH for development ---
        const exporter = await prisma.user.findUnique({
            where: { email: MOCK_EXPORTER_EMAIL },
        });

        if (!exporter) {
             return NextResponse.json({ message: "Mock Exporter not found" }, { status: 404 });
        }
        const exporterId = exporter.id;
        // ---------------------------------------------
        
        // 2. Fetch Batches related to this exporterId
        const batches = await prisma.batch.findMany({
            where: {
                exporterId: exporterId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            // Optionally select specific fields if needed
        });

        return NextResponse.json(batches, { status: 200 });

    } catch (error) {
        console.error("Batch GET Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

// --- POST Handler (Your existing code) ---
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
          exporterEmail = MOCK_EXPORTER_EMAIL, // Use the same mock email
          variety = "Grade A",
          pinCode = "400092",
          tests // Include tests from the request body
        } = body;

        // 1. Find exporter
        let exporter = await prisma.user.findUnique({
            where: { email: exporterEmail } 
        });

        if (!exporter) {
          // If exporter doesn't exist, create them (shouldn't happen with demo login)
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

        // 3. Create Batch (matching your exact schema)
        const newBatch = await prisma.batch.create({
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
            status: 'PENDING',
            tests: tests || [], // <--- Save the tests array
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
            details: { batchNumber, cropType, tests }
          }
        });

        return NextResponse.json(newBatch, { status: 201 }); // Return the created batch object

    } catch (error: any) {
        console.error("Batch Create Error:", error);
        return NextResponse.json({ message: "Failed to create batch" }, { status: 500 });
    }
}