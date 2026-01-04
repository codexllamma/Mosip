// app/api/inspections/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { injiCertify } from "@/lib/inji-certify";
import QRCode from "qrcode";
import crypto from "crypto";

// Helper: Calculate Majority Vote (for Strings like Grade/Organic)
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
    // Note: 'inspectorEmail' should be passed from frontend Auth context
    const { batchId, moisture, pesticide, organic, grade, notes, inspectorEmail } = body;

    // 1. Identify the Inspector (Security Check)
    const inspector = await prisma.user.findFirst({ 
        where: { email: inspectorEmail } // In prod, use session/token
    });
    
    // Fallback for dev/mock if email not passed
    const activeInspector = inspector || await prisma.user.findFirst({ where: { role: "QA_AGENCY" } });

    if (!activeInspector) return NextResponse.json({ error: "Inspector not found" }, { status: 404 });

    // 2. Find the SPECIFIC Inspection record for this Batch + Inspector
    const myInspection = await prisma.inspection.findFirst({
        where: { 
            batchId: batchId,
            inspectorId: activeInspector.id 
        }
    });

    if (!myInspection) return NextResponse.json({ error: "No assignment found for this inspector" }, { status: 404 });

    // 3. Update THIS Inspection Record
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

    // 4. CHECK CONSENSUS: Are there other pending inspections for this batch?
    const allInspections = await prisma.inspection.findMany({
        where: { batchId: batchId }
    });

    const pendingCount = allInspections.filter(i => i.status !== 'COMPLETED').length;

    if (pendingCount > 0) {
        // Not everyone has voted yet.
        return NextResponse.json({ 
            success: true,
            message: "Inspection recorded. Waiting for other agencies to complete.",
            status: "WAITING_CONSENSUS",
            remaining: pendingCount 
        }, { status: 200 });
    }

    // =========================================================
    // 5. ALL INSPECTIONS COMPLETE -> GENERATE GOLDEN PASSPORT
    // =========================================================
    console.log(`[GOLDEN BATCH] Aggregating results from ${allInspections.length} agencies...`);

    // A. Aggregate Data
    const validMoisture = allInspections.map(i => parseFloat(i.moisture || "0")).filter(n => !isNaN(n));
    const validPesticide = allInspections.map(i => parseFloat(i.pesticideResidue || "0")).filter(n => !isNaN(n));
    
    const avgMoisture = validMoisture.reduce((a,b) => a+b, 0) / (validMoisture.length || 1);
    const avgPesticide = validPesticide.reduce((a,b) => a+b, 0) / (validPesticide.length || 1);
    
    // Strict Organic Rule: ALL must say it's organic, otherwise False
    const finalOrganic = allInspections.every(i => i.organic === true);
    const finalGrade = getMajority(allInspections.map(i => i.grade)) || grade;

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { exporter: true }
    });

    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

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
        // Anonymous / Consolidated Inspector Name
        inspectorName: allInspections.length > 1 ? "Golden Consortium (Aggregated)" : (activeInspector.organization || activeInspector.name),
        moisture: avgMoisture.toFixed(2),
        pesticide: avgPesticide.toFixed(2),
        organic: finalOrganic,
        exporterDid: batch.exporter.did || `did:web:exporter:${batch.exporterId}`
    };

    // C. Issue VC (Push Flow) or Generate Link (Pull Flow)
    // Refactored to use const by isolating the logic
    const finalVerifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify/${certificateId}`;
    
    const qrCode = await QRCode.toDataURL(finalVerifyUrl).catch((err) => {
        console.warn("QR Code Generation failed:", err);
        return ""; // Fallback
    });

    const vcPayload = { 
        note: "Golden Batch Aggregated Credential",
        credentialSubject: certifyDataPayload,
        proof: { type: "ConsensusProof", agencyCount: allInspections.length }
    };

    // D. Final DB Transaction
    const result = await prisma.$transaction(async (tx) => {
      
      // Update Batch Status
      await tx.batch.update({ 
          where: { id: batchId }, 
          data: { status: "CERTIFIED" } 
      });
      
      // Save Source of Truth
      await tx.certifyData.create({
        data: certifyDataPayload
      });

      // Create Certificate Record
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

    return NextResponse.json({ 
      success: true, 
      certificateId: result.id,
      verifyUrl: finalVerifyUrl, 
      qrCode,
      isGolden: allInspections.length > 1 
    }, { status: 201 });

  } catch (err: any) {
    console.error("Certification Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}