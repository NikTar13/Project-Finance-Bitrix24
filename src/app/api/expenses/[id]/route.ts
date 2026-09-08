// PUT /api/expenses/[id] — изменить расход
// DELETE /api/expenses/[id] — удалить расход
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/current-user"
import { writeAudit } from "@/lib/audit"
import { expenseToDTO } from "@/lib/mappers"
import { rublesToKopecks } from "@/lib/money"
import { AUDIT_ACTIONS } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { amount, date, categoryId, comment } = body as {
    amount?: number
    date?: string
    categoryId?: string
    comment?: string
  }
  const existing = await db.expense.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 })

  const data: { amount?: number; date?: Date; categoryId?: string; comment?: string | null } = {}
  if (typeof amount === "number") {
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 })
    }
    data.amount = rublesToKopecks(amount)
  }
  if (typeof date === "string") {
    const d = new Date(date)
    if (isNaN(d.getTime())) return NextResponse.json({ error: "Некорректная дата" }, { status: 400 })
    data.date = d
  }
  if (typeof categoryId === "string") data.categoryId = categoryId
  if (typeof comment === "string") data.comment = comment.trim() || null

  const updated = await db.expense.update({
    where: { id },
    data,
    include: { project: true, category: true, createdBy: true },
  })

  const cur = await getCurrentUser()
  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "Expense",
    entityId: id,
    entityName: `${updated.project.name} — ${updated.category.name}`,
    details: { changes: data },
  })

  return NextResponse.json({ expense: expenseToDTO(updated) })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const existing = await db.expense.findUnique({
    where: { id },
    include: { project: true, category: true },
  })
  if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  await db.expense.delete({ where: { id } })

  const cur = await getCurrentUser()
  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.DELETE,
    entityType: "Expense",
    entityId: id,
    entityName: `${existing.project.name} — ${existing.category.name}`,
    details: { amountRubles: existing.amount / 100, date: existing.date.toISOString() },
  })

  return NextResponse.json({ ok: true })
}
