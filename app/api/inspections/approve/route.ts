// app/api/inspections/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { injiCertify } from "@/lib/inji-certify";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, moisture, pesticide, organic, grade, notes } = body;

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // 1. Ensure QA inspector exists
    let inspector = await prisma.user.findFirst({
      where: { role: "QA_AGENCY" }
    });

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

    // 2. Get batch + exporter (using correct relation name)
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { 
        exporter: true  // This matches your schema relation name
      }
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // 3. Issue VC via Inji Certify
    let vcResponse;
    let vcPayload;
    
    try {
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
        expirationDate: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        ).toISOString()
      });

      vcPayload = vcResponse.credential;
    } catch (vcError: any) {
      console.error("Inji Certify issuance failed:", vcError);
      
      // Fallback: Create mock VC if Inji fails
      vcPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: `urn:uuid:${batchId}`,
        type: ["VerifiableCredential", "FoodExportQualityCertificate"],
        issuer: {
          id: inspector.did || "did:web:apeda.gov.in:qa",
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
      
      vcResponse = null;
    }

    // 4. Generate verification URL
    const verifyUrl = vcResponse 
      ? injiCertify.generateVerifyUrl(vcResponse.credentialId)
      : `${BASE_URL}/api/verify/`;

    // 5. FULL TRANSACTION
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Inspection record
      await tx.inspection.create({
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

      // D. Final verify URL with certificate ID
      const finalVerifyUrl = vcResponse 
        ? verifyUrl
        : `${BASE_URL}/api/verify/${certificate.id}`;
      
      const qrCode = await QRCode.toDataURL(finalVerifyUrl);

      // E. Store VC
      await tx.verifiableCredential.create({
        data: {
          vcJson: vcPayload as any,
          issuerDid: inspector.did || "did:web:apeda.gov.in:qa",
          subjectDid: batch.exporter.did || "",
          signature: vcResponse?.credential?.proof?.jws || "mock-signature",
          verifyUrl: finalVerifyUrl,
          certificate: { connect: { id: certificate.id } }
        }
      });

      // F. Audit Log
      await tx.auditLog.create({
        data: {
          action: "ISSUED_CREDENTIAL",
          entityType: "CERTIFICATE",
          entityId: certificate.id,
          actorId: inspector.id,
          details: { 
            batchNumber: batch.batchNumber,
            credentialId: vcResponse?.credentialId || null,
            issuer: inspector.organization,
            injiIntegration: !!vcResponse
          }
        }
      });

      return { 
        success: true, 
        verifyUrl: finalVerifyUrl,
        certificateId: certificate.id,
        credentialId: vcResponse?.credentialId || null,
        qrCode,
        injiEnabled: !!vcResponse
      };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (err: any) {
    console.error("Inspection API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}