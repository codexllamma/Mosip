// app/api/inspections/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";
import crypto from "crypto";

// Helper: Calculate Majority Vote (for Strings like Grade)
function getMajority(arr: any[]) {
    if (arr.length === 0) return null;
    return arr.sort((a,b) =>
          arr.filter(v => v===a).length
        - arr.filter(v => v===b).length
    ).pop();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[INSPECTION_API] Received Approval Request:", JSON.stringify(body, null, 2));

    const { batchId, moisture, pesticide, organic, grade, notes, inspectorEmail } = body;

    if (!inspectorEmail || !batchId) {
        console.error("[INSPECTION_API] Error: Missing inspectorEmail or batchId.");
        return NextResponse.json({ error: "Missing inspectorEmail or batchId" }, { status: 400 });
    }

    // 1. Identify the Inspector (Strict Security Check)
    console.log(`[INSPECTION_API] Looking up Inspector User by email: ${inspectorEmail}`);
    const activeInspector = await prisma.user.findFirst({ 
        where: { email: inspectorEmail } 
    });

    if (!activeInspector) {
        console.error(`[INSPECTION_API] User not found for email: ${inspectorEmail}`);
        return NextResponse.json({ error: "Inspector user not found" }, { status: 404 });
    }
    console.log(`[INSPECTION_API] Inspector Identified: ${activeInspector.name} (ID: ${activeInspector.id})`);

    // 2. Find the SPECIFIC Inspection assignment for this Inspector + Batch
    console.log(`[INSPECTION_API] Verifying assignment for Batch ${batchId}...`);
    const myInspection = await prisma.inspection.findFirst({
        where: { 
            batchId: batchId,
            inspectorId: activeInspector.id,
            status: { not: 'COMPLETED' } // Optional: Prevent double-voting
        }
    });

    if (!myInspection) {
        console.error(`[INSPECTION_API] No PENDING assignment found for Inspector ${activeInspector.id} on Batch ${batchId}.`);
        return NextResponse.json({ error: "No pending inspection found for this inspector on this batch." }, { status: 404 });
    }
    console.log(`[INSPECTION_API] Found valid assignment: Inspection ID ${myInspection.id}`);

    // 3. Update THIS Inspection Record
    console.log("[INSPECTION_API] Updating Inspection Record...");
    await prisma.inspection.update({
        where: { id: myInspection.id },
        data: {
            moisture: moisture.toString(),
            pesticideResidue: pesticide.toString(),
            organic: Boolean(organic),
            grade: grade,
            notes: notes,
            status: 'COMPLETED',
            inspectedAt: new Date()
        }
    });
    console.log("[INSPECTION_API] Inspection marked as COMPLETED.");

    // 4. CHECK CONSENSUS: Count remaining pending inspections
    const allInspections = await prisma.inspection.findMany({
        where: { batchId: batchId }
    });

    const pendingCount = allInspections.filter(i => i.status !== 'COMPLETED').length;
    console.log(`[INSPECTION_API] Consensus Status: ${pendingCount} inspections remaining.`);

    if (pendingCount > 0) {
        return NextResponse.json({ 
            success: true,
            message: "Inspection recorded. Waiting for other agencies.",
            status: "WAITING_CONSENSUS",
            remaining: pendingCount 
        }, { status: 200 });
    }

    // =========================================================
    // 5. ALL INSPECTIONS COMPLETE -> GENERATE GOLDEN PASSPORT
    // =========================================================
    console.log(`[GOLDEN BATCH] All ${allInspections.length} agencies have submitted. Aggregating results...`);
    
    // A. Aggregate Data
    const validMoisture = allInspections.map(i => parseFloat(i.moisture || "0")).filter(n => !isNaN(n));
    const validPesticide = allInspections.map(i => parseFloat(i.pesticideResidue || "0")).filter(n => !isNaN(n));
    
    const avgMoisture = validMoisture.reduce((a,b) => a+b, 0) / (validMoisture.length || 1);
    const avgPesticide = validPesticide.reduce((a,b) => a+b, 0) / (validPesticide.length || 1);
    
    // Strict Organic Rule: ALL must say it's organic
    const finalOrganic = allInspections.every(i => i.organic === true);
    // Majority Grade Rule
    const finalGrade = getMajority(allInspections.map(i => i.grade)) || grade;

    console.log(`[GOLDEN BATCH] Calculated: Moisture=${avgMoisture.toFixed(2)}, Grade=${finalGrade}, Organic=${finalOrganic}`);

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { exporter: true }
    });

    if (!batch) {
        console.error("[INSPECTION_API] Critical: Batch not found for certificate generation.");
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const certificateId = crypto.randomUUID();
    
    // B. Prepare Final Certificate Data
    const certifyDataPayload = {
        certificateId: certificateId,
        batchNumber: batch.batchNumber,
        product: batch.cropType,          
        grade: finalGrade,                     
        origin: batch.location,
        quantity: `${batch.quantity} ${batch.unit}`, 
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        exporterName: batch.exporter.organization || batch.exporter.name,
        // If multiple agencies, use Consortium Name
        inspectorName: allInspections.length > 1 ? "Golden Consortium (Aggregated)" : (activeInspector.organization || activeInspector.name),
        moisture: avgMoisture.toFixed(2),
        pesticide: avgPesticide.toFixed(2),
        organic: finalOrganic,
        exporterDid: batch.exporter.did || `did:web:exporter:${batch.exporterId}`
    };

    // C. Generate VC
    const finalVerifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify/${certificateId}`;
    
    const qrCode = await QRCode.toDataURL(finalVerifyUrl).catch((err) => {
        console.warn("QR Code Generation failed:", err);
        return ""; 
    });

    const vcPayload = { 
        note: "Golden Batch Aggregated Credential",
        credentialSubject: certifyDataPayload,
        proof: { type: "ConsensusProof", agencyCount: allInspections.length }
    };

    // D. Final DB Transaction
    console.log("[INSPECTION_API] Executing Final DB Transaction (Certificate + VC)...");
    const result = await prisma.$transaction(async (tx) => {
      
      // Update Batch Status
      await tx.batch.update({ 
          where: { id: batchId }, 
          data: { status: "CERTIFIED" } 
      });
      
      // Save Certificate Data
      await tx.certifyData.create({
        data: certifyDataPayload
      });

      // Create Certificate Record + VC
      const cert = await tx.certificate.create({
        data: {
          id: certificateId,
          batchNumber: batch.batchNumber,
          productType: batch.cropType,
          exporterName: batch.exporter.organization || batch.exporter.name,
          qaAgencyName: certifyDataPayload.inspectorName,
          issuedAt: new Date(),
          expiresAt: new Date(certifyDataPayload.expiryDate),
          batchId,
          
          vc: {
            create: {
              vcJson: vcPayload as any,
              issuerDid: activeInspector.did || "did:web:consensus",
              subjectDid: batch.exporter.did || "",
              signature: "aggregated-consensus-signature",
              verifyUrl: finalVerifyUrl || ""
            }
          }
        }
      });

      return cert;
    });

    console.log(`[INSPECTION_API] Success! Certificate Created: ${result.id}`);

    return NextResponse.json({ 
      success: true, 
      certificateId: result.id,
      verifyUrl: finalVerifyUrl, 
      qrCode,
      isGolden: allInspections.length > 1 
    }, { status: 201 });

  } catch (err: any) {
    console.error("[INSPECTION_API] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}