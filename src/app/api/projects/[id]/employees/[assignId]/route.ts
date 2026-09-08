// DELETE /api/projects/[id]/employees/[assignId] — снять сотрудника с проекта
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/current-user"
import { writeAudit } from "@/lib/audit"
import { projectToDetailDTO } from "@/lib/mappers"
import { AUDIT_ACTIONS } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; assignId: string }> },
) {
  const { id, assignId } = await params
  const assignment = await db.projectUser.findUnique({
    where: { id: assignId },
    include: { user: true, project: true },
  })
  if (!assignment || assignment.projectId !== id) {
    return NextResponse.json({ error: "Назначение не найдено" }, { status: 404 })
  }
  await db.projectUser.delete({ where: { id: assignId } })

  const cur = await getCurrentUser()
  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.DELETE,
    entityType: "ProjectUser",
    entityId: assignId,
    entityName: `${assignment.user.name} ← ${assignment.project.name}`,
    details: { projectId: id, userId: assignment.userId },
  })

  const updated = await db.project.findUnique({ where: { id } })
  return NextResponse.json({ project: updated ? await projectToDetailDTO(updated) : null })
}
