import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get certificates + VC
    const certificates = await prisma.certificate.findMany({
      include: { vc: true },
      orderBy: { issuedAt: "desc" }
    });

    // 2. Normalize to match frontend shape
    const formatted = certificates.map(c => {
      const vc = c.vc?.vcJson || {};
      const subject = vc.credentialSubject || {};
      const quality = subject.quality || {};

      return {
        id: c.id,
        batch_number: c.batchNumber,
        crop_type: c.productType,
        exporter_name: c.exporterName,
        issued_at: c.issuedAt,
        verification_url: c.vc?.verifyUrl || "",
        credential_data: {
          issuer: vc.issuer || {},
          credentialSubject: {
            quality: {
              moisture: quality.moisture ?? "0",
              pesticide: quality.pesticide ?? "0",
              grade: quality.grade ?? "A",
              organic: quality.organic ?? false
            }
          }
        }
      };
    });

    return NextResponse.json(formatted);

  } catch (err: any) {
    console.error("Passports API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
