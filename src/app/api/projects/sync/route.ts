// POST /api/projects/sync — синхронизация проектов из Bitrix24 (mock REST)
// В реальном приложении: OAuth → REST sonet_group.get → upsert.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { bitrixProjectsGet } from "@/lib/bitrix24"
import { getCurrentUser } from "@/lib/current-user"
import { writeAudit } from "@/lib/audit"
import { AUDIT_ACTIONS, PROJECT_STATUSES } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function POST() {
  const cur = await getCurrentUser()
  const bitrixProjects = await bitrixProjectsGet()

  let created = 0
  let updated = 0
  for (const bp of bitrixProjects) {
    const existing = await db.project.findUnique({
      where: { bitrixProjectId: bp.ID },
    })
    const status = bp.CLOSED === "Y" ? PROJECT_STATUSES.CLOSED : PROJECT_STATUSES.ACTIVE
    if (existing) {
      await db.project.update({
        where: { id: existing.id },
        data: {
          name: bp.NAME,
          description: bp.DESCRIPTION,
          status,
          closedAt: bp.DATE_END ? new Date(bp.DATE_END) : existing.closedAt,
        },
      })
      updated++
    } else {
      await db.project.create({
        data: {
          bitrixProjectId: bp.ID,
          name: bp.NAME,
          description: bp.DESCRIPTION,
          status,
          startedAt: bp.DATE_START ? new Date(bp.DATE_START) : null,
          closedAt: bp.DATE_END ? new Date(bp.DATE_END) : null,
        },
      })
      created++
    }
  }

  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "Project",
    entityName: "Синхронизация проектов из Bitrix24",
    details: { source: "bitrix24", created, updated, total: bitrixProjects.length },
  })

  return NextResponse.json({ created, updated, total: bitrixProjects.length })
}
