// app/api/passports/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const certificates = await prisma.certificate.findMany({
      include: { 
        vc: true,
        batch: {
          include: {
            exporter: true,
            inspection: true
          }
        }
      },
      orderBy: { issuedAt: "desc" }
    });

    const formatted = certificates.map(c => {
      // 1. Safe parsing of vcJson
      let vcData: any = c.vc?.vcJson || {};

      // If it's stored as a string (which your logs suggest), parse it
      if (typeof vcData === 'string') {
        try {
          vcData = JSON.parse(vcData);
        } catch (e) {
          console.error("Failed to parse vcJson", e);
          vcData = {};
        }
      }

      // 2. Safely access properties using optional chaining on the 'any' type
      const subject = vcData.credentialSubject || {};
      const quality = subject.quality || {};
      const inspection = c.batch?.inspection;

      return {
        id: c.id,
        batch_number: c.batchNumber,
        crop_type: c.productType,
        exporter_name: c.exporterName,
        issued_at: c.issuedAt,
        expires_at: c.expiresAt,
        verification_url: c.vc?.verifyUrl || "",
        
        credential_data: {
          issuer: vcData.issuer || {
            id: c.vc?.issuerDid,
            name: c.qaAgencyName
          },
          credentialSubject: {
            batchNumber: c.batchNumber,
            productType: c.productType,
            exporterName: c.exporterName,
            // Prioritize real inspection data, fallback to VC data, fallback to defaults
            quality: inspection ? {
              moisture: inspection.moisture,
              pesticide: inspection.pesticideResidue,
              grade: inspection.grade,
              organic: inspection.organic
            } : {
              moisture: quality.moisture ?? "0",
              pesticide: quality.pesticide ?? "0",
              grade: quality.grade ?? "A",
              organic: quality.organic ?? false
            }
          }
        },
        
        issuer_did: c.vc?.issuerDid,
        subject_did: c.vc?.subjectDid,
        
        batch_details: c.batch ? {
          location: c.batch.location,
          destination: c.batch.destinationCountry,
          quantity: c.batch.quantity,
          unit: c.batch.unit,
          status: c.batch.status,
          variety: c.batch.variety,
          harvest_date: c.batch.harvestDate,
          traceability_code: c.batch.traceabilityCode,
          pin_code: c.batch.pinCode.toString()
        } : null
      };
    });

    return NextResponse.json(formatted);

  } catch (err: any) {
    console.error("Passports API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}