import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  // 1. Update the type definition to expect a Promise
  { params }: { params: Promise<{ certId: string }> }
) {
  // 2. Await the params object before destructuring
  const { certId } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { id: certId },
    include: { vc: true },
  });

  if (!certificate || !certificate.vc?.vcJson) {
    return new NextResponse("VC not found", { status: 404 });
  }

  return NextResponse.json(certificate.vc.vcJson, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}