import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Find the certificate to get related data
    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: { 
        vc: true 
      }
    });

    if (!cert) {
      return NextResponse.json(
        { message: "Certificate not found" },
        { status: 404 }
      );
    }

    // 2. Perform Transaction: Delete VC, Delete Cert, Update Batch Status
    await prisma.$transaction(async (tx) => {
      // A. Delete VC if it exists
      if (cert.vc) {
        await tx.verifiableCredential.delete({
          where: { id: cert.vc.id }
        });
      }

      // B. Delete Certificate
      await tx.certificate.delete({
        where: { id }
      });

      // C. Update Batch status to REJECTED so it appears back in the queue
      await tx.batch.update({
        where: { id: cert.batchId },
        data: { 
          status: 'REJECTED' 
        }
      });
    });

    return NextResponse.json({ 
      success: true, 
      message: "Passport revoked and batch marked as Rejected." 
    });

  } catch (error: any) {
    console.error("Revocation Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to revoke passport" },
      { status: 500 }
    );
  }
}