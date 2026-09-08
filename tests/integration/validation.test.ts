// ============================================================================
//  Тесты валидации и граничных случаев.
//  Проверяют, что API корректно отвергает некорректные данные — это часть
//  критерия «корректность финансовых расчётов».
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
  cleanupTestCategories,
} from "../setup"

let project: { id: string }
let incomeCat: { id: string }
let expenseCat: { id: string }

beforeAll(async () => {
  project = await getFirstProject()
  incomeCat = await getFirstIncomeCategory()
  expenseCat = await getFirstExpenseCategory()
})

afterAll(async () => {
  await cleanupTestCategories()
})

describe("Валидация сумм доходов", () => {
  test("нулевая сумма → 400", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: 0,
      date: new Date().toISOString(),
      categoryId: incomeCat.id,
    })
    expect(r.status).toBe(400)
    expect(r.data.error).toBeTruthy()
  })

  test("отрицательная сумма → 400", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: -1000,
      date: new Date().toISOString(),
      categoryId: incomeCat.id,
    })
    expect(r.status).toBe(400)
  })

  test("сумма свыше 1 млрд → 400", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: 1_000_000_001,
      date: new Date().toISOString(),
      categoryId: incomeCat.id,
    })
    expect(r.status).toBe(400)
  })

  test("нечисловая сумма → 400", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: "много",
      date: new Date().toISOString(),
      categoryId: incomeCat.id,
    })
    expect(r.status).toBe(400)
  })

  test("отсутствие projectId → 400", async () => {
    const r = await POST("/api/income", {
      amount: 1000,
      date: new Date().toISOString(),
      categoryId: incomeCat.id,
    })
    expect(r.status).toBe(400)
  })

  test("отсутствие categoryId → 400", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: 1000,
      date: new Date().toISOString(),
    })
    expect(r.status).toBe(400)
  })

  test("несуществующий projectId → 404", async () => {
    const r = await POST("/api/income", {
      projectId: "nonexistent-id",
      amount: 1000,
      date: new Date().toISOString(),
      categoryId: incomeCat.id,
    })
    expect(r.status).toBe(404)
  })

  test("несуществующий categoryId → 404", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: 1000,
      date: new Date().toISOString(),
      categoryId: "nonexistent-id",
    })
    expect(r.status).toBe(404)
  })

  test("некорректная дата → 400", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: 1000,
      date: "not-a-date",
      categoryId: incomeCat.id,
    })
    expect(r.status).toBe(400)
  })
})

describe("Валидация сумм расходов (симметрично доходам)", () => {
  test("нулевая сумма → 400", async () => {
    const r = await POST("/api/expenses", {
      projectId: project.id,
      amount: 0,
      date: new Date().toISOString(),
      categoryId: expenseCat.id,
    })
    expect(r.status).toBe(400)
  })

  test("отрицательная сумма → 400", async () => {
    const r = await POST("/api/expenses", {
      projectId: project.id,
      amount: -500,
      date: new Date().toISOString(),
      categoryId: expenseCat.id,
    })
    expect(r.status).toBe(400)
  })

  test("сумма свыше 1 млрд → 400", async () => {
    const r = await POST("/api/expenses", {
      projectId: project.id,
      amount: 2_000_000_000,
      date: new Date().toISOString(),
      categoryId: expenseCat.id,
    })
    expect(r.status).toBe(400)
  })
})

describe("Валидация категорий", () => {
  test("создание статьи с пустым именем → 400", async () => {
    const r = await POST("/api/categories", { type: "expense", name: "   " })
    expect(r.status).toBe(400)
  })

  test("создание статьи без типа → 400", async () => {
    const r = await POST("/api/categories", { name: "Тест" })
    expect(r.status).toBe(400)
  })

  test("создание статьи с некорректным типом → 400", async () => {
    const r = await POST("/api/categories", { type: "other", name: "Тест" })
    expect(r.status).toBe(400)
  })

  test("создание дубликата статьи → 409", async () => {
    const name = `Дубль ${TEST_MARKER}`
    const r1 = await POST("/api/categories", { type: "income", name })
    expect(r1.status).toBe(201)
    const r2 = await POST("/api/categories", { type: "income", name })
    expect(r2.status).toBe(409)
  })

  test("создание предустановленной статьи (повтор имени) → 409", async () => {
    const r = await POST("/api/categories", { type: "expense", name: "Дивиденды" })
    expect(r.status).toBe(409)
  })

  test("удаление предустановленной статьи → 400", async () => {
    const cats = await GET("/api/categories")
    const defaultCat = cats.data.expense.find((c: any) => c.isDefault)
    const r = await DELETE(`/api/categories/${defaultCat.id}?type=expense`)
    expect(r.status).toBe(400)
  })

  test("удаление статьи без указания типа → 400", async () => {
    const r = await DELETE("/api/categories/some-id")
    expect(r.status).toBe(400)
  })

  test("создание и удаление пользовательской статьи расхода с цветом", async () => {
    const name = `Тестовая ${TEST_MARKER}`
    const color = "#10b981"
    const r = await POST("/api/categories", { type: "expense", name, color })
    expect(r.status).toBe(201)
    expect(r.data.category.color).toBe(color)
    expect(r.data.category.isDefault).toBe(false)

    const del = await DELETE(`/api/categories/${r.data.category.id}?type=expense`)
    expect(del.status).toBe(200)
  })

  test("создание пользовательской статьи дохода (без цвета)", async () => {
    const name = `ТестДоход ${TEST_MARKER}`
    const r = await POST("/api/categories", { type: "income", name })
    expect(r.status).toBe(201)
    expect(r.data.category.isDefault).toBe(false)
    // очистка
    await DELETE(`/api/categories/${r.data.category.id}?type=income`)
  })
})

describe("404 на несуществующие сущности", () => {
  test("GET несуществующего проекта → 404", async () => {
    const r = await GET("/api/projects/nonexistent-id")
    expect(r.status).toBe(404)
  })

  test("DELETE несуществующего дохода → 404", async () => {
    const r = await DELETE("/api/income/nonexistent-id")
    expect(r.status).toBe(404)
  })

  test("DELETE несуществующего расхода → 404", async () => {
    const r = await DELETE("/api/expenses/nonexistent-id")
    expect(r.status).toBe(404)
  })
})

describe("Дробные суммы (копейки)", () => {
  test("сумма с копейками сохраняется точно", async () => {
    const r = await POST("/api/income", {
      projectId: project.id,
      amount: 1234.56,
      date: new Date().toISOString(),
      categoryId: incomeCat.id,
      comment: `fractional ${TEST_MARKER}`,
    })
    expect(r.status).toBe(201)
    expect(r.data.income.amount).toBe(1234.56)
    // очистка
    await DELETE(`/api/income/${r.data.income.id}`)
  })

  test("сумма 0.01 (минимальная) принимается", async () => {
    const r = await POST("/api/expenses", {
      projectId: project.id,
      amount: 0.01,
      date: new Date().toISOString(),
      categoryId: expenseCat.id,
      comment: `min ${TEST_MARKER}`,
    })
    expect(r.status).toBe(201)
    expect(r.data.expense.amount).toBeCloseTo(0.01, 2)
    await DELETE(`/api/expenses/${r.data.expense.id}`)
  })
})
