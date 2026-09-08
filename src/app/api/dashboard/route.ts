// GET /api/dashboard — KPI + графики
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { kopecksToRubles, profitability, profit } from "@/lib/money"
import type { DashboardDTO } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const [projects, incomes, expenses, expenseCategories] = await Promise.all([
    db.project.findMany(),
    db.income.findMany(),
    db.expense.findMany(),
    db.expenseCategory.findMany(),
  ])

  const projectsCount = projects.length
  const activeProjectsCount = projects.filter((p) => p.status === "ACTIVE").length

  const totalIncomeK = incomes.reduce((s, i) => s + i.amount, 0)
  const totalExpenseK = expenses.reduce((s, e) => s + e.amount, 0)
  const totalProfitK = profit(totalIncomeK, totalExpenseK)

  // расходы по статьям
  const catMap = new Map(expenseCategories.map((c) => [c.id, c]))
  const byCat = new Map<string, number>()
  for (const e of expenses) {
    byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount)
  }
  const expensesByCategory = Array.from(byCat.entries())
    .map(([catId, kopecks]) => {
      const c = catMap.get(catId)
      return {
        name: c?.name ?? "Без статьи",
        color: c?.color ?? "#94a3b8",
        amount: kopecksToRubles(kopecks),
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // прибыль по месяцам (последние 6)
  const now = new Date()
  const months: { key: string; label: string; income: number; expense: number; profit: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("ru-RU", { month: "short" })
    months.push({ key, label, income: 0, expense: 0, profit: 0 })
  }
  const monthIdx = new Map(months.map((m, i) => [m.key, i]))
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  for (const inc of incomes) {
    const idx = monthIdx.get(monthKey(inc.date))
    if (idx !== undefined) months[idx].income += inc.amount
  }
  for (const exp of expenses) {
    const idx = monthIdx.get(monthKey(exp.date))
    if (idx !== undefined) months[idx].expense += exp.amount
  }
  for (const m of months) {
    m.income = kopecksToRubles(m.income)
    m.expense = kopecksToRubles(m.expense)
    m.profit = m.income - m.expense
  }

  // последние операции (10)
  const recent = [
    ...incomes.map((i) => ({
      id: i.id,
      type: "income" as const,
      date: i.date,
      amount: kopecksToRubles(i.amount),
      categoryId: i.categoryId,
      projectId: i.projectId,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      date: e.date,
      amount: kopecksToRubles(e.amount),
      categoryId: e.categoryId,
      projectId: e.projectId,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10)

  // подтянем названия проекта/категории для recent
  const projectNames = new Map(projects.map((p) => [p.id, p.name]))
  const incomeCatNames = new Map(
    (await db.incomeCategory.findMany()).map((c) => [c.id, c.name]),
  )
  const recentTransactions = recent.map((r) => ({
    id: r.id,
    type: r.type,
    date: r.date.toISOString(),
    amount: r.amount,
    categoryName:
      r.type === "income"
        ? incomeCatNames.get(r.categoryId) ?? "—"
        : catMap.get(r.categoryId)?.name ?? "—",
    projectName: projectNames.get(r.projectId) ?? "—",
    projectId: r.projectId,
  }))

  const dto: DashboardDTO = {
    projectsCount,
    activeProjectsCount,
    totalIncome: kopecksToRubles(totalIncomeK),
    totalExpense: kopecksToRubles(totalExpenseK),
    totalProfit: kopecksToRubles(totalProfitK),
    totalProfitability: profitability(totalIncomeK, totalExpenseK),
    expensesByCategory,
    profitByMonth: months.map((m) => ({
      month: m.label,
      income: m.income,
      expense: m.expense,
      profit: m.profit,
    })),
    recentTransactions,
  }

  return NextResponse.json(dto)
}
