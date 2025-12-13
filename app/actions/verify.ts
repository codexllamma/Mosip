'use server' // <--- CRITICAL: Must be at the top

import { prisma } from "@/lib/db";

export async function verifyQrCode(scannedUrl: string) {
  try {
    // 1. Remove any surrounding whitespace
    const cleanUrl = scannedUrl.trim();
    
    console.log("SERVER: Verifying URL:", cleanUrl);

    // 2. Find credential
    const credential = await prisma.verifiableCredential.findFirst({
      where: {
        verifyUrl: cleanUrl 
      },
      include: {
        certificate: {
          include: {
            batch: {
              include: { exporter: true, inspection: true }
            }
          }
        }
      }
    });

    if (!credential || !credential.certificate) {
      console.log("SERVER: Credential not found for URL:", cleanUrl);
      return { success: false, message: "QR Code not found in database." };
    }

    const cert = credential.certificate;
    const isExpired = new Date(cert.expiresAt) < new Date();

    return {
      success: true,
      data: {
        status: isExpired ? "EXPIRED" : "VALID",
        product: cert.productType,
        batchNumber: cert.batchNumber,
        exporter: cert.exporterName,
        issuer: cert.qaAgencyName,
        verifyUrl: credential.verifyUrl,
        quality: cert.batch?.inspection ? {
          grade: cert.batch.inspection.grade,
          organic: cert.batch.inspection.organic
        } : null
      }
    };

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return { success: false, message: "Internal Server Error" };
  }
}