// POST /api/projects/[id]/employees — назначить сотрудника на проект
// тело запроса: { userId, projectRole }
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/current-user"
import { writeAudit } from "@/lib/audit"
import { projectToDetailDTO } from "@/lib/mappers"
import { AUDIT_ACTIONS, PROJECT_ROLES, type ProjectRole } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { userId, projectRole } = body as { userId?: string; projectRole?: ProjectRole }
  if (!userId) return NextResponse.json({ error: "userId обязателен" }, { status: 400 })
  if (!projectRole || !Object.values(PROJECT_ROLES).includes(projectRole)) {
    return NextResponse.json({ error: "Неверная роль проекта" }, { status: 400 })
  }
  const project = await db.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: "Проект не найден" }, { status: 404 })
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 })

  const existing = await db.projectUser.findUnique({
    where: { projectId_userId: { projectId: id, userId } },
  })
  if (existing) {
    return NextResponse.json({ error: "Сотрудник уже назначен" }, { status: 409 })
  }

  const cur = await getCurrentUser()
  const assignment = await db.projectUser.create({
    data: { projectId: id, userId, projectRole, assignedById: cur.id },
  })

  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "ProjectUser",
    entityId: assignment.id,
    entityName: `${user.name} → ${project.name}`,
    details: { projectRole, projectId: id, userId },
  })

  const updated = await db.project.findUnique({ where: { id } })
  return NextResponse.json(
    { project: updated ? await projectToDetailDTO(updated) : null },
    { status: 201 },
  )
}
