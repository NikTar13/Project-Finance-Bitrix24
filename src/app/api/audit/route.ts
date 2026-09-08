// GET /api/audit — журнал аудита (кто/когда/что)
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auditToDTO } from "@/lib/mappers"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500)
  const logs = await db.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return NextResponse.json({ logs: logs.map(auditToDTO) })
}
