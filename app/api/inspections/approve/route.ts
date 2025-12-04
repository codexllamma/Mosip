import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      batchId, 
      moisture, 
      pesticide, 
      organic, 
      grade, 
      notes 
    } = body;

    // --- CONFIGURATION ---
    // Hardcoded to localhost for the Hackathon Demo
    const BASE_URL = "http://localhost:3000";

    // --- 1. FIND ACTORS ---
    // We need to link this inspection to a real User (the Inspector)
    
    // Find the Inspector (QA Agency)
    // For the hackathon, we grab the first user with the QA_AGENCY role.
    const inspectorUser = await prisma.user.findFirst({
      where: { role: "QA_AGENCY" } 
    });

    if (!inspectorUser) {
      return NextResponse.json({ error: "No QA Agency user found. Please run SQL seeds." }, { status: 400 });
    }

    // Get Batch details to find the Exporter's info for the VC
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { exporter: true }
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // --- 2. EXECUTE TRANSACTION ---
    // We use a transaction so if VC generation fails, nothing is saved.
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Create Inspection Record
      const inspection = await tx.inspection.create({
        data: {
          moisture: moisture.toString(), 
          pesticideResidue: pesticide.toString(),
          organic: Boolean(organic),
          grade: grade,
          notes: notes,
          batch: { connect: { id: batchId } },
          inspector: { connect: { id: inspectorUser.id } }
        }
      });

      // B. Update Batch Status
      await tx.batch.update({
        where: { id: batchId },
        data: { status: "APPROVED" }
      });

      // C. Create Certificate Metadata
      // This allows the "Digital Passports" page to load fast without parsing JSON
      const certificate = await tx.certificate.create({
        data: {
          batchNumber: batch.batchNumber,
          productType: batch.cropType,
          exporterName: batch.exporter.organization || batch.exporter.name,
          qaAgencyName: inspectorUser.organization || inspectorUser.name,
          issuedAt: new Date(),
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // +1 Year validity
          batch: { connect: { id: batchId } }
        }
      });

      // D. Generate Verification URL & QR Code
      const verifyUrl = `${BASE_URL}/verify/${certificate.id}`;
      // Note: We generate the QR Data URL here but we don't strictly need to save the image blob 
      // if we generate it on the fly, but storing the URL is helpful.
      const qrCodeData = await QRCode.toDataURL(verifyUrl);

      // E. Create the Verifiable Credential (The JSON Blob)
      // This matches the W3C structure required by Inji
      const vcPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: `urn:uuid:${certificate.id}`,
        type: ["VerifiableCredential", "FoodExportQualityCertificate"],
        issuer: { 
          id: inspectorUser.did || "did:web:example.com", 
          name: inspectorUser.organization || "QA Agency" 
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: batch.exporter.did || "did:example:exporter",
          batchId: batch.batchNumber,
          productType: batch.cropType,
          quantity: batch.quantity,
          unit: batch.unit,
          inspectionResults: {
             moisture,
             pesticideResidue: pesticide,
             grade,
             organic
          }
        }
      };

      // F. Save the VC Record
      await tx.verifiableCredential.create({
        data: {
          vcJson: vcPayload as any, 
          issuerDid: inspectorUser.did || "did:temp",
          subjectDid: batch.exporter.did || "did:temp",
          signature: "mock-crypto-signature-generated-by-backend", 
          verifyUrl: verifyUrl,
          certificate: { connect: { id: certificate.id } }
        }
      });

      // G. Audit Log
      await tx.auditLog.create({
        data: {
          action: "ISSUED_CREDENTIAL",
          entityType: "CERTIFICATE",
          entityId: certificate.id,
          actorId: inspectorUser.id,
          details: { batchNumber: batch.batchNumber }
        }
      });

      return { success: true, verifyUrl, certificateId: certificate.id };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("Inspection API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}