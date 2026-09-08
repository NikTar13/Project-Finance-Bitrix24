// GET /api/projects/[id] — карточка проекта с финансами и сотрудниками
// PATCH /api/projects/[id] — обновить status / description
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/current-user"
import { writeAudit } from "@/lib/audit"
import { projectToDetailDTO } from "@/lib/mappers"
import { AUDIT_ACTIONS, PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const project = await db.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: "Проект не найден" }, { status: 404 })
  return NextResponse.json({ project: await projectToDetailDTO(project) })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { status, description } = body as {
    status?: ProjectStatus
    description?: string
  }
  const project = await db.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: "Проект не найден" }, { status: 404 })

  const data: { status?: ProjectStatus; description?: string } = {}
  if (status && Object.values(PROJECT_STATUSES).includes(status)) data.status = status
  if (typeof description === "string") data.description = description
  const updated = await db.project.update({ where: { id }, data })

  const cur = await getCurrentUser()
  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "Project",
    entityId: id,
    entityName: updated.name,
    details: { changes: data },
  })

  return NextResponse.json({ project: await projectToDetailDTO(updated) })
}
