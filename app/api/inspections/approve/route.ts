import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // Make sure this path is correct
import { injiCertify } from "@/lib/inji-certify";
import QRCode from "qrcode";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, moisture, pesticide, organic, grade, notes } = body;
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // ---------------------------------------------------------
    // 1. PREPARATION (READ ONLY)
    // ---------------------------------------------------------
    
    // Check Inspector
    let inspector = await prisma.user.findFirst({ where: { role: "QA_AGENCY" } });
    if (!inspector) {
      inspector = await prisma.user.create({
        data: {
          email: "inspector@apeda.gov.in",
          name: "QA Inspector",
          role: "QA_AGENCY",
          organization: "APEDA Quality Assurance",
          did: process.env.QA_AGENCY_DID || "did:web:apeda.gov.in:qa"
        }
      });
    }

    // Get Batch
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { exporter: true }
    });

    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    // ---------------------------------------------------------
    // 2. EXTERNAL CALLS (OUTSIDE TRANSACTION)
    // ---------------------------------------------------------
    
    const certificateId = crypto.randomUUID(); // Pre-generate ID
    let vcResponse;
    let vcPayload;

    try {
      console.log("Calling Inji Certify...");
      vcResponse = await injiCertify.issueCredential({
        credentialSubject: {
          id: batch.exporter.did || undefined,
          batchNumber: batch.batchNumber,
          productType: batch.cropType,
          exporterName: batch.exporter.name,
          exporterOrganization: batch.exporter.organization || undefined,
          origin: batch.location,
          destination: batch.destinationCountry,
          quantity: batch.quantity,
          unit: batch.unit,
          qualityMetrics: {
            moisture: moisture.toString(),
            pesticideResidue: pesticide.toString(),
            organic: Boolean(organic),
            grade: grade
          },
          inspectionDate: new Date().toISOString(),
          inspector: {
            name: inspector.name,
            organization: inspector.organization || "QA Agency"
          }
        },
        issuer: {
          id: inspector.did || process.env.QA_AGENCY_DID || "did:web:apeda.gov.in:qa",
          name: inspector.organization || "APEDA Quality Assurance"
        },
        type: ["VerifiableCredential", "FoodExportQualityCertificate"],
        expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      });
      vcPayload = vcResponse.credential;
    } catch (vcError) {
      console.warn("Inji failed, using mock:", vcError);
      // Fallback Mock VC
      vcPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: `urn:uuid:${batchId}`,
        type: ["VerifiableCredential", "MockCertificate"],
        issuer: { id: inspector.did, name: "QA Agency" },
        issuanceDate: new Date().toISOString(),
        credentialSubject: { batchId: batch.batchNumber }
      };
      vcResponse = null;
    }

    // Generate QR
    const finalVerifyUrl = vcResponse 
      ? injiCertify.generateVerifyUrl(vcResponse.credentialId)
      : `${BASE_URL}/api/verify/${certificateId}`;
      
    const qrCode = await QRCode.toDataURL(finalVerifyUrl);

    // ---------------------------------------------------------
    // 3. DB TRANSACTION (OPTIMIZED)
    // ---------------------------------------------------------
    
    const result = await prisma.$transaction(async (tx) => {
      
      // Step A: Update Batch & Create Inspection (Parallel)
      await Promise.all([
        tx.batch.update({
          where: { id: batchId },
          data: { status: "APPROVED" }
        }),
        tx.inspection.create({
          data: {
            moisture: moisture.toString(),
            pesticideResidue: pesticide.toString(),
            organic: Boolean(organic),
            grade,
            notes,
            batch: { connect: { id: batchId } },
            inspector: { connect: { id: inspector.id } }
          }
        })
      ]);

      // Step B: Create Certificate AND VC together (Nested Write)
      // This merges 2 DB calls into 1, making it much faster/safer
      const certificate = await tx.certificate.create({
        data: {
          id: certificateId,
          batchNumber: batch.batchNumber,
          productType: batch.cropType,
          exporterName: batch.exporter.organization || batch.exporter.name,
          qaAgencyName: inspector.organization || inspector.name,
          issuedAt: new Date(),
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          batch: { connect: { id: batchId } },
          
          // NESTED CREATE: Saves the VC at the exact same time
          vc: {
            create: {
              vcJson: vcPayload as any,
              issuerDid: inspector.did || "did:web:apeda.gov.in:qa",
              subjectDid: batch.exporter.did || "",
              signature: vcResponse?.credential?.proof?.jws || "mock-signature",
              verifyUrl: finalVerifyUrl
            }
          }
        }
      });

      // Step C: Audit Log
      await tx.auditLog.create({
        data: {
          action: "ISSUED_CREDENTIAL",
          entityType: "CERTIFICATE",
          entityId: certificateId,
          actorId: inspector.id,
          details: { batchNumber: batch.batchNumber }
        }
      });

      return { 
        success: true, 
        certificateId: certificate.id, 
        verifyUrl: finalVerifyUrl, 
        qrCode 
      };

    }, {
      // ⚠️ IMPORTANT: Increase timeout to 20 seconds
      maxWait: 5000, 
      timeout: 20000 
    });

    return NextResponse.json(result, { status: 201 });

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}