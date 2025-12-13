// app/api/verify/[certId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const { certId } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { id: certId },
      include: {
        vc: true,
        batch: {
          include: {
            exporter: true,
            inspection: {
              include: {
                inspector: true
              }
            }
          }
        }
      }
    });

    if (!certificate) {
      return NextResponse.json(
        { 
          status: "NOT_FOUND", 
          message: "Certificate not found" 
        },
        { status: 404 }
      );
    }

    const isExpired = new Date(certificate.expiresAt) < new Date();
    const inspection = certificate.batch?.inspection;
    const vc = certificate.vc;

    const response = {
      status: isExpired ? "EXPIRED" : "VALID",
      
      notice: "⚠️ This endpoint provides METADATA ONLY. For cryptographic verification, use Inji Verify.",
      verification_required: true,
      
      certificate_id: certificate.id,
      batch_number: certificate.batchNumber,
      
      verification_urls: {
        inji_verify: vc?.verifyUrl || null,
        this_endpoint: `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify/${certId}`
      },
      
      issued_at: certificate.issuedAt,
      expires_at: certificate.expiresAt,
      is_expired: isExpired,
      checked_at: new Date().toISOString(),
      
      issuer: {
        name: certificate.qaAgencyName,
        did: vc?.issuerDid || null,
        type: "Quality Assurance Agency"
      },
      
      holder: {
        name: certificate.exporterName,
        organization: certificate.batch?.exporter?.organization || null,
        did: vc?.subjectDid || null,
        email: certificate.batch?.exporter?.email || null
      },
      
      product: {
        type: certificate.productType,
        batch_number: certificate.batchNumber,
        origin: certificate.batch?.location || null,
        destination: certificate.batch?.destinationCountry || null,
        quantity: certificate.batch?.quantity || null,
        unit: certificate.batch?.unit || "kg",
        harvest_date: certificate.batch?.harvestDate || null
      },
      
      quality_metrics: inspection ? {
        moisture: inspection.moisture,
        pesticide_residue: inspection.pesticideResidue,
        organic: inspection.organic,
        grade: inspection.grade,
        heavy_metals: inspection.heavyMetals,
        iso_code: inspection.isoCode,
        inspection_date: inspection.inspectedAt,
        inspector: {
          name: inspection.inspector?.name || null,
          organization: inspection.inspector?.organization || null
        },
        notes: inspection.notes
      } : null,
      
      credential_data: vc?.vcJson || null,
      
      signature: {
        value: vc?.signature || null,
        note: "Use Inji Verify to validate cryptographic signature"
      },
      
      how_to_verify: {
        recommended: {
          method: "Inji Verify",
          url: vc?.verifyUrl || null,
          description: "Cryptographically verify credential signature, issuer DID, and revocation status",
          steps: [
            "Visit Inji Verify URL above",
            "Upload credential or scan QR code",
            "Inji Verify checks: signature validity, issuer DID authenticity, expiration, revocation"
          ]
        },
        alternative: {
          method: "Manual Verification",
          description: "Verify using W3C VC verification libraries"
        }
      },
      
      warnings: [
        isExpired && "⚠️ Certificate has EXPIRED",
        !vc?.issuerDid && "⚠️ Issuer DID not found",
        !vc?.verifyUrl && "⚠️ Verification URL not available"
      ].filter(Boolean)
    };

    return NextResponse.json(response);

  } catch (err: any) {
    console.error("Verify API Error:", err);
    return NextResponse.json(
      { 
        status: "ERROR", 
        message: err.message
      },
      { status: 500 }
    );
  }
}