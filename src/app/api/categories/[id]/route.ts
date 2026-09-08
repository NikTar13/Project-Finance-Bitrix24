// DELETE /api/categories/[id]?type=income|expense — удалить статью (не дефолтную)
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/current-user"
import { writeAudit } from "@/lib/audit"
import { AUDIT_ACTIONS } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(req.url)
  const type = url.searchParams.get("type")
  if (type !== "income" && type !== "expense") {
    return NextResponse.json({ error: "type (income|expense) обязателен" }, { status: 400 })
  }
  const cur = await getCurrentUser()

  if (type === "income") {
    const cat = await db.incomeCategory.findUnique({ where: { id } })
    if (!cat) return NextResponse.json({ error: "Не найдено" }, { status: 404 })
    if (cat.isDefault) {
      return NextResponse.json({ error: "Предустановленную статью удалить нельзя" }, { status: 400 })
    }
    const used = await db.income.count({ where: { categoryId: id } })
    if (used > 0) {
      return NextResponse.json(
        { error: `Статья используется в ${used} записях доходов` },
        { status: 400 },
      )
    }
    await db.incomeCategory.delete({ where: { id } })
    await writeAudit({
      userId: cur.id,
      action: AUDIT_ACTIONS.DELETE,
      entityType: "IncomeCategory",
      entityId: id,
      entityName: cat.name,
      details: { type: "income" },
    })
    return NextResponse.json({ ok: true })
  }

  const cat = await db.expenseCategory.findUnique({ where: { id } })
  if (!cat) return NextResponse.json({ error: "Не найдено" }, { status: 404 })
  if (cat.isDefault) {
    return NextResponse.json({ error: "Предустановленную статью удалить нельзя" }, { status: 400 })
  }
  const used = await db.expense.count({ where: { categoryId: id } })
  if (used > 0) {
    return NextResponse.json(
      { error: `Статья используется в ${used} записях расходов` },
      { status: 400 },
    )
  }
  await db.expenseCategory.delete({ where: { id } })
  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.DELETE,
    entityType: "ExpenseCategory",
    entityId: id,
    entityName: cat.name,
    details: { type: "expense" },
  })
  return NextResponse.json({ ok: true })
}
