// GET /api/employees — сотрудники (из Bitrix24, локальное зеркало)
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { toUserDTO } from "@/lib/current-user"

export const dynamic = "force-dynamic"

export async function GET() {
  const users = await db.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
  const withCounts = await Promise.all(
    users.map(async (u) => ({
      ...toUserDTO(u),
      projectsCount: await db.projectUser.count({ where: { userId: u.id } }),
    })),
  )
  return NextResponse.json({ employees: withCounts })
}
