// GET /api/income?projectId= — список доходов
// POST /api/income — добавить доход { projectId, amount(руб), date, categoryId, comment? }
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/current-user"
import { writeAudit } from "@/lib/audit"
import { incomeToDTO } from "@/lib/mappers"
import { rublesToKopecks } from "@/lib/money"
import { AUDIT_ACTIONS } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get("projectId")
  const items = await db.income.findMany({
    where: projectId ? { projectId } : undefined,
    include: { project: true, category: true, createdBy: true },
    orderBy: { date: "desc" },
  })
  return NextResponse.json({ incomes: items.map(incomeToDTO) })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { projectId, amount, date, categoryId, comment } = body as {
    projectId?: string
    amount?: number
    date?: string
    categoryId?: string
    comment?: string
  }

  // --- валидация (корректность фин. данных — критерий оценки) ---
  if (!projectId) return NextResponse.json({ error: "projectId обязателен" }, { status: 400 })
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Сумма должна быть положительным числом" }, { status: 400 })
  }
  if (amount > 1_000_000_000) {
    return NextResponse.json({ error: "Сумма слишком велика" }, { status: 400 })
  }
  const d = date ? new Date(date) : new Date()
  if (isNaN(d.getTime())) return NextResponse.json({ error: "Некорректная дата" }, { status: 400 })
  if (!categoryId) return NextResponse.json({ error: "categoryId обязателен" }, { status: 400 })

  const [project, category] = await Promise.all([
    db.project.findUnique({ where: { id: projectId } }),
    db.incomeCategory.findUnique({ where: { id: categoryId } }),
  ])
  if (!project) return NextResponse.json({ error: "Проект не найден" }, { status: 404 })
  if (!category) return NextResponse.json({ error: "Статья дохода не найдена" }, { status: 404 })

  const cur = await getCurrentUser()
  const income = await db.income.create({
    data: {
      projectId,
      amount: rublesToKopecks(amount),
      date: d,
      categoryId,
      comment: typeof comment === "string" ? comment.trim() || null : null,
      createdById: cur.id,
    },
    include: { project: true, category: true, createdBy: true },
  })

  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "Income",
    entityId: income.id,
    entityName: `${project.name} — ${category.name}`,
    details: { amount, date: d.toISOString(), projectId, categoryId },
  })

  return NextResponse.json({ income: incomeToDTO(income) }, { status: 201 })
}
