import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildVerifiableCredential } from "@/lib/vc-template";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ certId: string }> }
) {
  const { certId } = await context.params;

  const certificate = await prisma.certificate.findUnique({
    where: { id: certId },
    include: {
      batch: {
        include: {
          exporter: true,
          inspection: {
            include: { inspector: true }
          }
        }
      }
    }
  });

  if (!certificate) {
    return new NextResponse("VC not found", { status: 404 });
  }

  const inspection = certificate.batch?.inspection;

  const vc = buildVerifiableCredential({
    certificateId: certificate.id,
    issuer: {
      id: "did:web:apeda.gov.in:qa",
      name: "APEDA Quality Assurance"
    },
    issuanceDate: certificate.issuedAt.toISOString(),
    credentialSubject: {
      id: certificate.batch?.exporter?.did ?? undefined,
      certificateId: certificate.id,
      batchNumber: certificate.batchNumber,
      product: certificate.productType,
      origin: certificate.batch?.location,
      destination: certificate.batch?.destinationCountry,
      quantity: `${certificate.batch?.quantity} ${certificate.batch?.unit ?? "kg"}`,

      grade: inspection?.grade,
      organic: inspection?.organic,
      moisture: inspection?.moisture,
      pesticide: inspection?.pesticideResidue,

      exporterName: certificate.exporterName,
      inspectorName: inspection?.inspector?.name,
      inspectionDate: inspection?.inspectedAt,
      expiryDate: certificate.expiresAt,
    }
  });

  return NextResponse.json(vc, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
