import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { certId: string } }
) {
  const { certId } = params;

  const certificate = await prisma.certificate.findUnique({
    where: { id: certId },
    include: { vc: true }
  });

  if (!certificate || !certificate.vc?.vcJson) {
    return new NextResponse("VC not found", { status: 404 });
  }

  return NextResponse.json(
    certificate.vc.vcJson,
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      }
    }
  );
}
