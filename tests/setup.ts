// ============================================================================
//  Общий setup для интеграционных и E2E тестов.
//
//  Подход к «режиму реальной работы»: тесты обращаются к запущенному dev-серверу
//  на http://localhost:3000 — это максимально близко к боевому режиму (реальный
//  HTTP, реальная БД, реальный React-рендер).
//
//  Чтобы тесты были детерминированными и не ломали dev-данные, используем
//  уникальные маркеры (timestamp) для создаваемых сущностей и удаляем их после.
//  Базовые seed-данные не мутируем — проверяем относительно них.
// ============================================================================

import { test } from "bun:test"

export const BASE = "http://localhost:3000"

// Уникальный маркер для тестовых сущностей (чтобы отличать от seed-данных)
export const TEST_MARKER = `__test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`

export interface ApiResult<T = unknown> {
  status: number
  data: T
}

/** Универсальный HTTP-клиент для тестов. Автоматически парсит JSON. */
export async function api(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<ApiResult> {
  const { json, headers, ...rest } = init ?? {}
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data }
}

export const GET = (path: string, init?: RequestInit) => api(path, { ...init, method: "GET" })
export const POST = (path: string, json?: unknown, init?: RequestInit) =>
  api(path, { ...init, method: "POST", json })
export const PATCH = (path: string, json?: unknown, init?: RequestInit) =>
  api(path, { ...init, method: "PATCH", json })
export const DELETE = (path: string, init?: RequestInit) => api(path, { ...init, method: "DELETE" })

// --- Хелперы для тестов ---------------------------------------------------

/** Сравнение чисел с допуском (для float-расчётов рентабельности). */
export function approxEqual(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps
}

/** Получить первый проект из списка (для использования в тестах). */
export async function getFirstProject(): Promise<{ id: string; name: string }> {
  const r = await GET("/api/projects")
  if (r.status !== 200) throw new Error(`projects: ${r.status}`)
  const projects = (r.data as { projects: Array<{ id: string; name: string }> }).projects
  if (projects.length === 0) throw new Error("Нет проектов — выполните seed")
  return projects[0]
}

/** Получить первую статью дохода. */
export async function getFirstIncomeCategory(): Promise<{ id: string; name: string }> {
  const r = await GET("/api/categories")
  const cats = (r.data as { income: Array<{ id: string; name: string }> }).income
  if (cats.length === 0) throw new Error("Нет статей дохода")
  return cats[0]
}

/** Получить первую статью расхода. */
export async function getFirstExpenseCategory(): Promise<{
  id: string
  name: string
  color: string | null
}> {
  const r = await GET("/api/categories")
  const cats = (r.data as {
    expense: Array<{ id: string; name: string; color: string | null }>
  }).expense
  if (cats.length === 0) throw new Error("Нет статей расхода")
  return cats[0]
}

/** Очистить все тестовые статьи (по маркеру в имени). */
export async function cleanupTestCategories() {
  const r = await GET("/api/categories")
  const data = r.data as {
    income: Array<{ id: string; name: string }>
    expense: Array<{ id: string; name: string }>
  }
  for (const c of [...data.income, ...data.expense]) {
    if (c.name.includes("__test_")) {
      await DELETE(`/api/categories/${c.id}?type=${data.income.includes(c) ? "income" : "expense"}`)
    }
  }
}

/** Очистить тестовые доходы/расходы (по комментарию с маркером). */
export async function cleanupTestTransactions() {
  for (const endpoint of ["/api/income", "/api/expenses"]) {
    const r = await GET(endpoint)
    const items = (r.data as { [k: string]: Array<{ id: string; comment: string | null }> })[
      endpoint === "/api/income" ? "incomes" : "expenses"
    ]
    for (const it of items) {
      if (it.comment?.includes("__test_")) {
        await DELETE(`${endpoint}/${it.id}`)
      }
    }
  }
}

/** Реэкспорт test для удобства. */
export { test }
