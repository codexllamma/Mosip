import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { injiCertify } from "@/lib/inji-certify";
import QRCode from "qrcode";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batchId, moisture, pesticide, organic, grade, notes } = body;

    // 1. Fetch Context (Inspector & Batch)
    let inspector = await prisma.user.findFirst({ where: { role: "QA_AGENCY" } });
    
    // Safety check: Create Default Inspector if none exists
    if (!inspector) {
      inspector = await prisma.user.create({
        data: {
          email: "inspector@apeda.gov.in",
          name: "APEDA Inspector",
          role: "QA_AGENCY",
          organization: "APEDA",
          did: process.env.QA_AGENCY_DID || "did:web:apeda.gov.in"
        }
      });
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { exporter: true }
    });

    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const certificateId = crypto.randomUUID();
    
    // ---------------------------------------------------------
    // 2. PREPARE DATA FOR "PULL" FLOW (The Postgres Plugin)
    // ---------------------------------------------------------
    // This MUST be flat to match your CertifyData Prisma model
    const certifyDataPayload = {
        certificateId: certificateId,
        batchNumber: batch.batchNumber,
        product: batch.cropType,          // Mapped to 'product' in DB
        grade: grade,                     // Top-level in DB
        origin: batch.location,
        quantity: `${batch.quantity} ${batch.unit}`, // String in DB
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        exporterName: batch.exporter.organization || batch.exporter.name,
        inspectorName: inspector.organization || inspector.name,
        moisture: moisture.toString(),
        pesticide: pesticide.toString(),
        organic: Boolean(organic),
        exporterDid: batch.exporter.did || `did:web:exporter:${batch.exporterId}`
    };

    // ---------------------------------------------------------
    // 3. ATTEMPT "PUSH" FLOW (Inji API Call)
    // ---------------------------------------------------------
    // This MUST be nested to match the InjiCertifyClient interface
    
    let vcResponse, vcPayload, finalVerifyUrl, qrCode;
    
    try {
        console.log(`Issuing VC for Batch ${batch.batchNumber}...`);
        
        vcResponse = await injiCertify.issueCredential({
            credentialSubject: {
                id: batch.exporter.did || undefined,
                // Explicit Mapping (Do NOT spread certifyDataPayload here)
                batchNumber: batch.batchNumber,
                productType: batch.cropType,       // Inji expects 'productType'
                exporterName: batch.exporter.name,
                exporterOrganization: batch.exporter.organization || undefined,
                origin: batch.location,
                destination: batch.destinationCountry,
                quantity: batch.quantity,          // Inji expects number
                unit: batch.unit,
                qualityMetrics: {                  // Inji expects nested object
                    moisture: moisture.toString(),
                    pesticideResidue: pesticide.toString(),
                    organic: Boolean(organic),
                    grade: grade
                },
                inspectionDate: new Date().toISOString(),
                inspector: {
                    name: inspector.name,
                    organization: inspector.organization || "APEDA Quality Assurance"
                }
            },
            issuer: {
                id: inspector.did || "did:web:apeda.gov.in",
                name: inspector.organization || "APEDA"
            },
            type: ["VerifiableCredential", "FoodExportCertificate"],
            expirationDate: certifyDataPayload.expiryDate
        });

        vcPayload = vcResponse.credential;
        finalVerifyUrl = injiCertify.generateVerifyUrl(vcResponse.credentialId);
        qrCode = await QRCode.toDataURL(finalVerifyUrl);

    } catch (e: any) {
        console.warn("⚠️ Push issuance failed. Falling back to DB-only 'Pull' flow.", e.message);
        
        finalVerifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify/${certificateId}`;
        qrCode = await QRCode.toDataURL(finalVerifyUrl);
        
        // Placeholder for the DB if API fails
        vcPayload = { 
            note: "Generated via OIDC Pull Flow (API Unavailable)",
            credentialSubject: certifyDataPayload
        }; 
    }

    // ---------------------------------------------------------
    // 4. DB TRANSACTION
    // ---------------------------------------------------------
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Update Status
      await tx.batch.update({ 
          where: { id: batchId }, 
          data: { status: "CERTIFIED" } 
      });
      
      // B. Create Inspection
      await tx.inspection.create({
        data: {
          moisture: moisture.toString(),
          pesticideResidue: pesticide.toString(),
          organic: Boolean(organic),
          grade,
          notes,
          batchId,
          inspectorId: inspector.id
        }
      });

      // C. Save to CertifyData (Source of Truth for Postgres Plugin)
      await tx.certifyData.create({
        data: certifyDataPayload
      });

      // D. Save Certificate (For Dashboard)
      const cert = await tx.certificate.create({
        data: {
          id: certificateId,
          batchNumber: batch.batchNumber,
          productType: batch.cropType,
          exporterName: batch.exporter.organization || batch.exporter.name,
          qaAgencyName: inspector.organization || inspector.name,
          issuedAt: new Date(),
          expiresAt: new Date(certifyDataPayload.expiryDate),
          batchId,
          
          vc: {
            create: {
              vcJson: vcPayload as any,
              issuerDid: inspector.did || "",
              subjectDid: batch.exporter.did || "",
              signature: vcPayload.proof?.jws || "pending-oidc-issuance",
              verifyUrl: finalVerifyUrl
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
      qrCode 
    }, { status: 201 });

  } catch (err: any) {
    console.error("Certification Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}