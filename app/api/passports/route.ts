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
            inspections: true // Match plural name in schema.prisma
          }
        }
      },
      orderBy: { issuedAt: "desc" }
    });

    const formatted = certificates.map(c => {
      // 1. Safe parsing of vcJson
      let vcData: any = c.vc?.vcJson || {};

      // Handle JSON stored as string
      if (typeof vcData === 'string') {
        try {
          vcData = JSON.parse(vcData);
        } catch (e) {
          console.error("Failed to parse vcJson", e);
          vcData = {};
        }
      }

      // 2. Safe access to quality metrics
      const subject = vcData.credentialSubject || {};
      const quality = subject.quality || {};
      
      // Since Batch has "inspections" (array), we take the first one
      const inspection = c.batch?.inspections?.[0];

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
            // Prioritize real inspection data, then VC data, then defaults
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