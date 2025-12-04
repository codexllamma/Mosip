import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 actions
    });

    // Transform Prisma (CamelCase) -> Frontend (snake_case)
    const formattedLogs = logs.map(log => ({
      id: log.id,
      entity_type: log.entityType,
      entity_id: log.entityId,
      action: log.action,
      actor_role: log.actorId ? 'system' : 'unknown', // Simplified logic
      actor_name: "System User", // In real app, join with User table
      details: log.details || {},
      created_at: log.createdAt
    }));

    return NextResponse.json(formattedLogs);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}