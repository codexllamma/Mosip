import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ certId: string }> }  // params is now a Promise
) {
  try {
    // Await params to get the actual values
    const { certId } = await params;

    const vcRecord = await prisma.verifiableCredential.findUnique({
      where: { certificateId: certId },
      include: {
        certificate: {
          include: {
            batch: true
          }
        }
      }
    });

    if (!vcRecord) {
      return NextResponse.json(
        { status: "NOT_FOUND", message: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "VALID",
      certId,
      payload: vcRecord.vcJson,
      issuedAt: vcRecord.certificate.issuedAt,
      expiresAt: vcRecord.certificate.expiresAt,
      checkedAt: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json(
      { status: "ERROR", message: err.message },
      { status: 500 }
    );
  }
}