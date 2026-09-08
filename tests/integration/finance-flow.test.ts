// ============================================================================
//  Интеграционный тест полного цикла — ядро «режима реальной работы».
//
//  Сценарий (один test-флоу, чтобы проверить консистентность данных):
//   1. Зафиксировать baseline дашборда и проекта
//   2. Создать доход → проверить, что он появился и итоги пересчитаны
//   3. Создать расход → проверить пересчёт прибыли и рентабельности
//   4. Проверить, что аудит зафиксировал оба действия
//   5. Проверить формулу рентабельности на реальных данных
//   6. Удалить доход и расход → проверить откат к baseline
//   7. Проверить, что аудит зафиксировал удаления
//
//  Используем уникальный маркер в комментарии для очистки.
// ============================================================================

import { test, expect, describe, beforeAll, afterAll } from "bun:test"
import {
  GET,
  POST,
  DELETE,
  TEST_MARKER,
  getFirstProject,
  getFirstIncomeCategory,
  getFirstExpenseCategory,
  cleanupTestTransactions,
  approxEqual,
} from "../setup"

let project: { id: string; name: string }
let incomeCat: { id: string; name: string }
let expenseCat: { id: string; name: string; color: string | null }

// baseline метрики
let baseProjectIncome: number
let baseProjectExpense: number
let baseProjectProfit: number
let baseDashboardIncome: number
let baseAuditCount: number

const INCOME_AMOUNT = 77777
const EXPENSE_AMOUNT = 33333

let createdIncomeId: string
let createdExpenseId: string

beforeAll(async () => {
  project = await getFirstProject()
  incomeCat = await getFirstIncomeCategory()
  expenseCat = await getFirstExpenseCategory()

  // baseline проекта
  const pr = await GET(`/api/projects/${project.id}`)
  expect(pr.status).toBe(200)
  baseProjectIncome = pr.data.project.income
  baseProjectExpense = pr.data.project.expense
  baseProjectProfit = pr.data.project.profit

  // baseline дашборда
  const d = await GET("/api/dashboard")
  baseDashboardIncome = d.data.totalIncome

  // baseline аудита
  const a = await GET("/api/audit")
  baseAuditCount = a.data.logs.length
})

afterAll(async () => {
  await cleanupTestTransactions()
})

describe("Полный цикл: создание → пересчёт → аудит → удаление", () => {
  test("Шаг 1: создание дохода", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: INCOME_AMOUNT,
      date: new Date().toISOString(),
      categoryId: incomeCat.id,
      comment: `test income ${TEST_MARKER}`,
    })
    expect(r.status).toBe(201)
    expect(r.data.income).toBeDefined()
    expect(r.data.income.amount).toBe(INCOME_AMOUNT)
    expect(r.data.income.projectId).toBe(project.id)
    expect(r.data.income.categoryName).toBe(incomeCat.name)
    createdIncomeId = r.data.income.id
  })

  test("Шаг 2: доход появился в списке проекта", async () => {
    const r = await GET(`/api/income?projectId=${project.id}`)
    const found = r.data.incomes.find((i: any) => i.id === createdIncomeId)
    expect(found).toBeDefined()
    expect(found.amount).toBe(INCOME_AMOUNT)
    expect(found.comment).toContain(TEST_MARKER)
  })

  test("Шаг 3: доход проекта увеличился на INCOME_AMOUNT", async () => {
    const r = await GET(`/api/projects/${project.id}`)
    expect(r.data.project.income).toBeCloseTo(baseProjectIncome + INCOME_AMOUNT, 2)
    // расход не изменился
    expect(r.data.project.expense).toBeCloseTo(baseProjectExpense, 2)
    // прибыль выросла на ту же сумму
    expect(r.data.project.profit).toBeCloseTo(baseProjectProfit + INCOME_AMOUNT, 2)
  })

  test("Шаг 4: общий доход дашборда увеличился", async () => {
    const r = await GET("/api/dashboard")
    expect(r.data.totalIncome).toBeCloseTo(baseDashboardIncome + INCOME_AMOUNT, 0)
  })

  test("Шаг 5: создание расхода", async () => {
    const r = await POST("/api/expenses", {
      projectId: project.id,
      amount: EXPENSE_AMOUNT,
      date: new Date().toISOString(),
      categoryId: expenseCat.id,
      comment: `test expense ${TEST_MARKER}`,
    })
    expect(r.status).toBe(201)
    expect(r.data.expense.amount).toBe(EXPENSE_AMOUNT)
    createdExpenseId = r.data.expense.id
  })

  test("Шаг 6: расход проекта увеличился, прибыль упала на разность", async () => {
    const r = await GET(`/api/projects/${project.id}`)
    const expectedIncome = baseProjectIncome + INCOME_AMOUNT
    const expectedExpense = baseProjectExpense + EXPENSE_AMOUNT
    const expectedProfit = expectedIncome - expectedExpense
    expect(r.data.project.income).toBeCloseTo(expectedIncome, 2)
    expect(r.data.project.expense).toBeCloseTo(expectedExpense, 2)
    expect(r.data.project.profit).toBeCloseTo(expectedProfit, 2)
  })

  test("Шаг 7: рентабельность = profit / expense × 100 (формула из README)", async () => {
    const r = await GET(`/api/projects/${project.id}`)
    const p = r.data.project
    if (p.expense > 0) {
      const expected = (p.profit / p.expense) * 100
      expect(approxEqual(p.profitability, expected, 0.01)).toBe(true)
    }
  })

  test("Шаг 8: аудит зафиксировал создание дохода", async () => {
    const r = await GET("/api/audit")
    const found = r.data.logs.find(
      (l: any) =>
        l.action === "CREATE" &&
        l.entityType === "Income" &&
        l.entityId === createdIncomeId,
    )
    expect(found).toBeDefined()
    expect(found.userName).toBeTruthy()
    expect(() => JSON.parse(found.details)).not.toThrow()
    const details = JSON.parse(found.details)
    expect(details.amount).toBe(INCOME_AMOUNT)
  })

  test("Шаг 9: аудит зафиксировал создание расхода", async () => {
    const r = await GET("/api/audit")
    const found = r.data.logs.find(
      (l: any) =>
        l.action === "CREATE" &&
        l.entityType === "Expense" &&
        l.entityId === createdExpenseId,
    )
    expect(found).toBeDefined()
    const details = JSON.parse(found.details)
    expect(details.amount).toBe(EXPENSE_AMOUNT)
  })

  test("Шаг 10: удаление дохода", async () => {
    const r = await DELETE(`/api/income/${createdIncomeId}`)
    expect(r.status).toBe(200)
    expect(r.data.ok).toBe(true)
  })

  test("Шаг 11: удаление расхода", async () => {
    const r = await DELETE(`/api/expenses/${createdExpenseId}`)
    expect(r.status).toBe(200)
    expect(r.data.ok).toBe(true)
  })

  test("Шаг 12: после удаления метрики проекта вернулись к baseline", async () => {
    const r = await GET(`/api/projects/${project.id}`)
    expect(r.data.project.income).toBeCloseTo(baseProjectIncome, 2)
    expect(r.data.project.expense).toBeCloseTo(baseProjectExpense, 2)
    expect(r.data.project.profit).toBeCloseTo(baseProjectProfit, 2)
  })

  test("Шаг 13: доход и расход отсутствуют в списках", async () => {
    const [ir, er] = await Promise.all([
      GET(`/api/income?projectId=${project.id}`),
      GET(`/api/expenses?projectId=${project.id}`),
    ])
    expect(ir.data.incomes.find((i: any) => i.id === createdIncomeId)).toBeUndefined()
    expect(er.data.expenses.find((e: any) => e.id === createdExpenseId)).toBeUndefined()
  })

  test("Шаг 14: аудит зафиксировал удаления", async () => {
    const r = await GET("/api/audit")
    const delIncome = r.data.logs.find(
      (l: any) =>
        l.action === "DELETE" &&
        l.entityType === "Income" &&
        l.entityId === createdIncomeId,
    )
    const delExpense = r.data.logs.find(
      (l: any) =>
        l.action === "DELETE" &&
        l.entityType === "Expense" &&
        l.entityId === createdExpenseId,
    )
    expect(delIncome).toBeDefined()
    expect(delExpense).toBeDefined()
  })
})
