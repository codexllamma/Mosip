import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Prevent Next.js from caching this route statically
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch certificates with the related VC data
    const certificates = await prisma.certificate.findMany({
      include: {
        vc: true, // We need this to get the verifyUrl and vcJson
      },
      orderBy: { issuedAt: 'desc' }
    });

    // 2. Map Prisma (CamelCase) data to the format your Frontend expects
    const formatted = certificates.map(cert => ({
      id: cert.id,
      batch_number: cert.batchNumber,
      crop_type: cert.productType,
      exporter_name: cert.exporterName,
      issued_at: cert.issuedAt,
      
      // Get the URL from the relational table
      verification_url: cert.vc?.verifyUrl || "",
      
      // Pass the raw W3C JSON blob so the frontend can parse specific fields
      // (moisture, pesticide, grade, etc.)
      credential_data: cert.vc?.vcJson || {}
    }));

    return NextResponse.json(formatted);

  } catch (error: any) {
    console.error("Passports API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}