import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { translateBatch } from "@/lib/translationService"; // Use batch function

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') || 'en';

    // 1. Fetch Data from DB (Parallel)
    const [totalBatches, pendingBatches, certificates, auditLogs, allBatches] = await Promise.all([
      prisma.batch.count(),
      prisma.batch.count({ where: { status: { in: ['SUBMITTED', 'PENDING_APPROVAL'] } } }),
      prisma.certificate.count(),
      prisma.auditLog.findMany({ 
        take: 5, 
        orderBy: { createdAt: 'desc' } 
      }),
      prisma.batch.findMany({ select: { cropType: true, quantity: true } })
    ]);

    // 2. Aggregate Crop Volumes
    const cropMap = new Map<string, number>();
    allBatches.forEach(b => {
      cropMap.set(b.cropType, (cropMap.get(b.cropType) || 0) + b.quantity);
    });
    
    const rawCropNames = Array.from(cropMap.keys());
    const rawActivityDescriptions = auditLogs.map(log => 
      `${log.action.replace('_', ' ')} - ${log.entityType}`
    );

    // 🚀 3. BATCH TRANSLATION (ONE CALL)
    // Combine both arrays into one for the fastest possible translation
    const allTextToTranslate = [...rawCropNames, ...rawActivityDescriptions];
    const translatedResults = await translateBatch(allTextToTranslate, lang);

    // 4. Split results back into their original categories
    const translatedCropNames = translatedResults.slice(0, rawCropNames.length);
    const translatedDescriptions = translatedResults.slice(rawCropNames.length);

    // 5. Build Final Objects
    const cropVolumes = rawCropNames.map((name, index) => ({
      cropType: translatedCropNames[index],
      volume: cropMap.get(name) || 0
    }));

    const recentActivity = auditLogs.map((log, index) => ({
      id: log.id,
      description: translatedDescriptions[index],
      time: new Date(log.createdAt).toLocaleTimeString(), 
      status: log.action.includes('REJECT') ? 'warning' : 'success'
    }));

    // 6. Return the JSON
    return NextResponse.json({
      stats: {
        batchesSubmitted: totalBatches,
        pendingInspections: pendingBatches,
        passportsIssued: certificates,
        avgApprovalTime: "24h" 
      },
      cropVolumes,
      recentActivity
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}