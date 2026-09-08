// GET /api/categories — все статьи (доходы + расходы)
// POST /api/categories — создать статью { type: 'income'|'expense', name, color? }
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/current-user"
import { writeAudit } from "@/lib/audit"
import { incomeCategoryToDTO, expenseCategoryToDTO } from "@/lib/mappers"
import { AUDIT_ACTIONS } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function GET() {
  const [income, expense] = await Promise.all([
    db.incomeCategory.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    db.expenseCategory.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
  ])
  return NextResponse.json({
    income: income.map(incomeCategoryToDTO),
    expense: expense.map(expenseCategoryToDTO),
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { type, name, color } = body as {
    type?: "income" | "expense"
    name?: string
    color?: string
  }
  if (type !== "income" && type !== "expense") {
    return NextResponse.json({ error: "type должен быть income или expense" }, { status: 400 })
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name обязателен" }, { status: 400 })
  }
  const cur = await getCurrentUser()

  if (type === "income") {
    const exists = await db.incomeCategory.findUnique({ where: { name: name.trim() } })
    if (exists) return NextResponse.json({ error: "Такая статья уже есть" }, { status: 409 })
    const cat = await db.incomeCategory.create({
      data: { name: name.trim(), isDefault: false, createdById: cur.id },
    })
    await writeAudit({
      userId: cur.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: "IncomeCategory",
      entityId: cat.id,
      entityName: cat.name,
      details: { type: "income", name: cat.name },
    })
    return NextResponse.json({ category: incomeCategoryToDTO(cat) }, { status: 201 })
  }

  // расход
  const exists = await db.expenseCategory.findUnique({ where: { name: name.trim() } })
  if (exists) return NextResponse.json({ error: "Такая статья уже есть" }, { status: 409 })
  const cat = await db.expenseCategory.create({
    data: {
      name: name.trim(),
      isDefault: false,
      color: typeof color === "string" ? color : null,
      createdById: cur.id,
    },
  })
  await writeAudit({
    userId: cur.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "ExpenseCategory",
    entityId: cat.id,
    entityName: cat.name,
    details: { type: "expense", name: cat.name, color: cat.color },
  })
  return NextResponse.json({ category: expenseCategoryToDTO(cat) }, { status: 201 })
}
