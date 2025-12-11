import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, moisture, pesticide, organic, grade, notes } = body;

    const BASE_URL = "http://localhost:3000";

    // ----------------------------
    // 1. Ensure QA inspector exists
    // ----------------------------
    let inspector = await prisma.user.findFirst({
      where: { role: "QA_AGENCY" }
    });

    if (!inspector) {
      inspector = await prisma.user.create({
        data: {
          email: "inspector@apeda.gov.in",
          name: "QA Inspector",
          role: "QA_AGENCY",
          organization: "APEDA Quality Assurance"
        }
      });
    }

    // ----------------------------
    // 2. Get batch + exporter
    // ----------------------------
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { exporter: true }
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // ----------------------------
    // 3. FULL TRANSACTION
    // ----------------------------
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Inspection record
      const inspection = await tx.inspection.create({
        data: {
          moisture: moisture.toString(),
          pesticideResidue: pesticide.toString(),
          organic: Boolean(organic),
          grade,
          notes,
          batch: { connect: { id: batchId }},
          inspector: { connect: { id: inspector.id }}
        }
      });

      // B. Mark Batch Approved
      await tx.batch.update({
        where: { id: batchId },
        data: { status: "APPROVED" }
      });

      // C. Create certificate
      const certificate = await tx.certificate.create({
        data: {
          batchNumber: batch.batchNumber,
          productType: batch.cropType,
          exporterName: batch.exporter.organization || batch.exporter.name,
          qaAgencyName: inspector.organization || inspector.name,
          issuedAt: new Date(),
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          batch: { connect: { id: batchId } }
        }
      });

      // D. Generate VC URL + QR
      const verifyUrl = `${BASE_URL}api/verify/${certificate.id}`;
      const qrCode = await QRCode.toDataURL(verifyUrl);

      // E. VC PAYLOAD (IMPORTANT: matches frontend format!)
      const vcPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: `urn:uuid:${certificate.id}`,
        type: ["VerifiableCredential", "FoodExportQualityCertificate"],
        issuer: {
          id: inspector.did || "did:web:example.com",
          name: inspector.organization || "QA Agency"
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          batchId: batch.batchNumber,
          productType: batch.cropType,
          exporter: batch.exporter.name,
          quality: {
            moisture,
            pesticide,
            grade,
            organic
          }
        }
      };

      // F. Save VC
      await tx.verifiableCredential.create({
        data: {
          vcJson: vcPayload as any,
          issuerDid: inspector.did || "did:temp",
          subjectDid: batch.exporter.did || "did:temp",
          signature: "mock-crypto-signature",
          verifyUrl,
          certificate: { connect: { id: certificate.id } }
        }
      });

      // G. Audit Log (inside transaction = safe)
      await tx.auditLog.create({
        data: {
          action: "ISSUED_CREDENTIAL",
          entityType: "CERTIFICATE",
          entityId: certificate.id,
          actorId: inspector.id,
          details: { batchNumber: batch.batchNumber }
        }
      });

      return { success: true, verifyUrl, certificateId: certificate.id };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (err: any) {
    console.error("Inspection API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
