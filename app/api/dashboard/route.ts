import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch Key Metrics in Parallel
    const [totalBatches, pendingBatches, certificates, auditLogs, allBatches] = await Promise.all([
      prisma.batch.count(),
      prisma.batch.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.certificate.count(),
      prisma.auditLog.findMany({ 
        take: 5, 
        orderBy: { createdAt: 'desc' } 
      }),
      prisma.batch.findMany({ select: { cropType: true, quantity: true } }) // For Charts
    ]);

    // 2. Calculate Crop Volumes
    const cropMap = new Map<string, number>();
    allBatches.forEach(b => {
      const current = cropMap.get(b.cropType) || 0;
      cropMap.set(b.cropType, current + b.quantity);
    });
    
    const cropVolumes = Array.from(cropMap.entries()).map(([cropType, volume]) => ({
      cropType,
      volume
    }));

    // 3. Format Audit Logs
    const recentActivity = auditLogs.map(log => ({
      id: log.id,
      description: `${log.action.replace('_', ' ')} - ${log.entityType}`,
      time: new Date(log.createdAt).toLocaleTimeString(), // Simplified for demo
      status: log.action.includes('REJECT') ? 'warning' : 'success'
    }));

    return NextResponse.json({
      stats: {
        batchesSubmitted: totalBatches,
        pendingInspections: pendingBatches,
        passportsIssued: certificates,
        avgApprovalTime: "24h" // Mocked for hackathon
      },
      cropVolumes,
      recentActivity
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}