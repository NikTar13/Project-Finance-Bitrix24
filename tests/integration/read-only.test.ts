// ============================================================================
//  Интеграционные тесты read-only эндпоинтов против запущенного dev-сервера.
//  Проверяют корректность расчётов, структуру ответов, базовые инварианты.
// ============================================================================

import { test, expect, describe, beforeAll } from "bun:test"
import { GET, approxEqual } from "../setup"

let dashboard: any
let projects: any
let categories: any
let employees: any
let audit: any

beforeAll(async () => {
  const [d, p, c, e, a] = await Promise.all([
    GET("/api/dashboard"),
    GET("/api/projects"),
    GET("/api/categories"),
    GET("/api/employees"),
    GET("/api/audit"),
  ])
  expect(d.status).toBe(200)
  expect(p.status).toBe(200)
  expect(c.status).toBe(200)
  expect(e.status).toBe(200)
  expect(a.status).toBe(200)
  dashboard = d.data
  projects = p.data.projects
  categories = c.data
  employees = e.data.employees
  audit = a.data.logs
})

describe("GET /api/dashboard", () => {
  test("содержит все обязательные поля", () => {
    for (const f of [
      "projectsCount",
      "activeProjectsCount",
      "totalIncome",
      "totalExpense",
      "totalProfit",
      "totalProfitability",
      "expensesByCategory",
      "profitByMonth",
      "recentTransactions",
    ]) {
      expect(dashboard).toHaveProperty(f)
    }
  })

  test("totalProfit = totalIncome − totalExpense", () => {
    expect(dashboard.totalProfit).toBeCloseTo(
      dashboard.totalIncome - dashboard.totalExpense,
      2,
    )
  })

  test("totalProfitability = totalProfit / totalExpense × 100", () => {
    if (dashboard.totalExpense > 0) {
      const expected = (dashboard.totalProfit / dashboard.totalExpense) * 100
      expect(approxEqual(dashboard.totalProfitability, expected, 0.01)).toBe(true)
    }
  })

  test("activeProjectsCount ≤ projectsCount", () => {
    expect(dashboard.activeProjectsCount).toBeLessThanOrEqual(dashboard.projectsCount)
  })

  test("expensesByCategory: суммы положительные, цвета — hex", () => {
    for (const c of dashboard.expensesByCategory) {
      expect(c.amount).toBeGreaterThan(0)
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  test("сумма расходов по статьям = totalExpense", () => {
    const sum = dashboard.expensesByCategory.reduce((s: number, c: any) => s + c.amount, 0)
    expect(sum).toBeCloseTo(dashboard.totalExpense, 0)
  })

  test("profitByMonth: 6 месяцев, profit = income − expense", () => {
    expect(dashboard.profitByMonth).toHaveLength(6)
    for (const m of dashboard.profitByMonth) {
      expect(m.profit).toBeCloseTo(m.income - m.expense, 2)
    }
  })

  test("recentTransactions: не более 10, отсортированы по убыванию даты", () => {
    expect(dashboard.recentTransactions.length).toBeLessThanOrEqual(10)
    for (let i = 1; i < dashboard.recentTransactions.length; i++) {
      const prev = new Date(dashboard.recentTransactions[i - 1].date).getTime()
      const curr = new Date(dashboard.recentTransactions[i].date).getTime()
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })

  test("recentTransactions: каждая операция имеет валидный тип", () => {
    for (const t of dashboard.recentTransactions) {
      expect(["income", "expense"]).toContain(t.type)
      expect(t.amount).toBeGreaterThan(0)
      expect(t.projectId).toBeTruthy()
    }
  })
})

describe("GET /api/projects", () => {
  test("возвращает массив проектов", () => {
    expect(Array.isArray(projects)).toBe(true)
    expect(projects.length).toBeGreaterThan(0)
  })

  test("каждый проект содержит финансы и рентабельность", () => {
    for (const p of projects) {
      expect(typeof p.income).toBe("number")
      expect(typeof p.expense).toBe("number")
      expect(typeof p.profit).toBe("number")
      expect(p.profitability === null || typeof p.profitability === "number").toBe(true)
      expect(typeof p.employeesCount).toBe("number")
    }
  })

  test("profit = income − expense для каждого проекта", () => {
    for (const p of projects) {
      expect(p.profit).toBeCloseTo(p.income - p.expense, 2)
    }
  })

  test("рентабельность = profit / expense × 100 (если expense > 0)", () => {
    for (const p of projects) {
      if (p.expense > 0) {
        const expected = (p.profit / p.expense) * 100
        expect(approxEqual(p.profitability, expected, 0.01)).toBe(true)
      } else {
        expect(p.profitability).toBeNull()
      }
    }
  })

  test("сумма доходов по проектам = totalIncome дашборда", () => {
    const sum = projects.reduce((s: number, p: any) => s + p.income, 0)
    expect(sum).toBeCloseTo(dashboard.totalIncome, 0)
  })

  test("сумма расходов по проектам = totalExpense дашборда", () => {
    const sum = projects.reduce((s: number, p: any) => s + p.expense, 0)
    expect(sum).toBeCloseTo(dashboard.totalExpense, 0)
  })

  test("статусы принимают только допустимые значения", () => {
    for (const p of projects) {
      expect(["ACTIVE", "ON_HOLD", "CLOSED"]).toContain(p.status)
    }
  })

  test("bitrixProjectId уникален", () => {
    const ids = projects.map((p: any) => p.bitrixProjectId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("GET /api/categories", () => {
  test("возвращает income и expense категории", () => {
    expect(Array.isArray(categories.income)).toBe(true)
    expect(Array.isArray(categories.expense)).toBe(true)
  })

  test("5 предустановленных статей расходов (по ТЗ)", () => {
    const defaultExpense = categories.expense.filter((c: any) => c.isDefault)
    expect(defaultExpense).toHaveLength(5)
    const names = defaultExpense.map((c: any) => c.name).sort()
    expect(names).toEqual(
      [
        "Аренда сервера",
        "Внутренние программисты",
        "Внешние программисты",
        "Дивиденды",
        "Расходы на ИИ",
      ].sort(),
    )
  })

  test("предустановленные статьи расходов имеют цвета (для графика)", () => {
    for (const c of categories.expense.filter((x: any) => x.isDefault)) {
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  test("есть предустановленные статьи доходов", () => {
    const defaultIncome = categories.income.filter((c: any) => c.isDefault)
    expect(defaultIncome.length).toBeGreaterThanOrEqual(4)
  })

  test("имена категорий уникальны в рамках типа", () => {
    const incomeNames = categories.income.map((c: any) => c.name)
    const expenseNames = categories.expense.map((c: any) => c.name)
    expect(new Set(incomeNames).size).toBe(incomeNames.length)
    expect(new Set(expenseNames).size).toBe(expenseNames.length)
  })
})

describe("GET /api/employees", () => {
  test("возвращает массив сотрудников из Bitrix24", () => {
    expect(Array.isArray(employees)).toBe(true)
    expect(employees.length).toBeGreaterThanOrEqual(8)
  })

  test("каждый сотрудник имеет bitrixUserId и роль", () => {
    for (const e of employees) {
      expect(typeof e.bitrixUserId).toBe("string")
      expect(["ADMIN", "FINANCIER", "MANAGER", "EMPLOYEE"]).toContain(e.role)
      expect(typeof e.projectsCount).toBe("number")
    }
  })

  test("email уникальны", () => {
    const emails = employees.map((e: any) => e.email)
    expect(new Set(emails).size).toBe(emails.length)
  })

  test("есть хотя бы один администратор", () => {
    expect(employees.some((e: any) => e.role === "ADMIN")).toBe(true)
  })
})

describe("GET /api/audit", () => {
  test("возвращает массив записей", () => {
    expect(Array.isArray(audit)).toBe(true)
    expect(audit.length).toBeGreaterThan(0)
  })

  test("каждая запись содержит обязательные поля", () => {
    for (const l of audit) {
      expect(typeof l.action).toBe("string")
      expect(["CREATE", "UPDATE", "DELETE"]).toContain(l.action)
      expect(typeof l.entityType).toBe("string")
      expect(typeof l.createdAt).toBe("string")
      // details — валидный JSON
      expect(() => JSON.parse(l.details)).not.toThrow()
    }
  })

  test("записи отсортированы по убыванию даты", () => {
    for (let i = 1; i < audit.length; i++) {
      const prev = new Date(audit[i - 1].createdAt).getTime()
      const curr = new Date(audit[i].createdAt).getTime()
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })
})

describe("GET /api/auth/me", () => {
  test("возвращает текущего пользователя", async () => {
    const r = await GET("/api/auth/me")
    expect(r.status).toBe(200)
    expect(r.data.user).toBeDefined()
    expect(typeof r.data.user.name).toBe("string")
    expect(r.data.user.isActive).toBe(true)
  })
})
