// ============================================================================
//  Тесты управления проектами и командой.
//  Синхронизация с Bitrix24, назначение/снятие сотрудников, аудит.
// ============================================================================

import { test, expect, describe, beforeAll } from "bun:test"
import {
  GET,
  POST,
  PATCH,
  DELETE,
  TEST_MARKER,
  getFirstProject,
  cleanupTestTransactions,
} from "../setup"

let project: { id: string; name: string }

beforeAll(async () => {
  project = await getFirstProject()
})

describe("POST /api/projects/sync — синхронизация с Bitrix24", () => {
  test("возвращает отчёт о синхронизации", async () => {
    const r = await POST("/api/projects/sync")
    expect(r.status).toBe(200)
    expect(typeof r.data.created).toBe("number")
    expect(typeof r.data.updated).toBe("number")
    expect(typeof r.data.total).toBe("number")
    expect(r.data.total).toBeGreaterThan(0)
  })

  test("повторная синхронизация не создаёт дубликаты (created=0)", async () => {
    const r = await POST("/api/projects/sync")
    expect(r.status).toBe(200)
    expect(r.data.created).toBe(0)
    expect(r.data.updated).toBe(r.data.total)
  })

  test("после синхронизации проекты доступны в /api/projects", async () => {
    const r = await GET("/api/projects")
    expect(r.data.projects.length).toBeGreaterThanOrEqual(6)
  })
})

describe("GET /api/projects/:id — карточка проекта", () => {
  test("возвращает детали с командой", async () => {
    const r = await GET(`/api/projects/${project.id}`)
    expect(r.status).toBe(200)
    expect(r.data.project.id).toBe(project.id)
    expect(Array.isArray(r.data.project.employees)).toBe(true)
    expect(typeof r.data.project.income).toBe("number")
    expect(typeof r.data.project.expense).toBe("number")
    expect(typeof r.data.project.profit).toBe("number")
  })

  test("employeesCount = длина массива employees", async () => {
    const r = await GET(`/api/projects/${project.id}`)
    expect(r.data.project.employeesCount).toBe(r.data.project.employees.length)
  })
})

describe("PATCH /api/projects/:id — обновление статуса", () => {
  test("изменение статуса на ON_HOLD", async () => {
    const r = await PATCH(`/api/projects/${project.id}`, { status: "ON_HOLD" })
    expect(r.status).toBe(200)
    expect(r.data.project.status).toBe("ON_HOLD")
  })

  test("возврат статуса в ACTIVE", async () => {
    const r = await PATCH(`/api/projects/${project.id}`, { status: "ACTIVE" })
    expect(r.status).toBe(200)
    expect(r.data.project.status).toBe("ACTIVE")
  })

  test("некорректный статус игнорируется (не падает)", async () => {
    const r = await PATCH(`/api/projects/${project.id}`, { status: "INVALID" })
    expect(r.status).toBe(200)
    expect(r.data.project.status).toBe("ACTIVE") // остался прежним
  })

  test("обновление description", async () => {
    const newDesc = `Updated ${TEST_MARKER}`
    const r = await PATCH(`/api/projects/${project.id}`, { description: newDesc })
    expect(r.status).toBe(200)
    expect(r.data.project.description).toBe(newDesc)
  })
})

describe("POST /api/projects/:id/employees — назначение сотрудников", () => {
  let assignedId: string
  let assignedUserId: string

  test("назначение доступного сотрудника", async () => {
    // найдём сотрудника, не назначенного на этот проект
    const [proj, emps] = await Promise.all([
      GET(`/api/projects/${project.id}`),
      GET("/api/employees"),
    ])
    const assigned = new Set(proj.data.project.employees.map((e: any) => e.userId))
    const free = emps.data.employees.find((e: any) => !assigned.has(e.id))
    expect(free).toBeDefined()

    const r = await POST(`/api/projects/${project.id}/employees`, {
      userId: free.id,
      projectRole: "DEVELOPER",
    })
    expect(r.status).toBe(201)
    expect(r.data.project.employees.length).toBe(proj.data.project.employees.length + 1)
    assignedId = r.data.project.employees.find(
      (e: any) => e.userId === free.id,
    ).id
    assignedUserId = free.id
  })

  test("повторное назначение того же сотрудника → 409", async () => {
    const r = await POST(`/api/projects/${project.id}/employees`, {
      userId: assignedUserId,
      projectRole: "QA",
    })
    expect(r.status).toBe(409)
  })

  test("назначение без userId → 400", async () => {
    const r = await POST(`/api/projects/${project.id}/employees`, {
      projectRole: "DEVELOPER",
    })
    expect(r.status).toBe(400)
  })

  test("назначение с некорректной ролью → 400", async () => {
    const r = await POST(`/api/projects/${project.id}/employees`, {
      userId: assignedUserId,
      projectRole: "SUPERHERO",
    })
    expect(r.status).toBe(400)
  })

  test("снятие сотрудника с проекта", async () => {
    const before = await GET(`/api/projects/${project.id}`)
    const r = await DELETE(`/api/projects/${project.id}/employees/${assignedId}`)
    expect(r.status).toBe(200)
    expect(r.data.project.employees.length).toBe(before.data.project.employees.length - 1)
  })

  test("повторное снятие → 404", async () => {
    const r = await DELETE(`/api/projects/${project.id}/employees/${assignedId}`)
    expect(r.status).toBe(404)
  })
})

describe("Аудит операций с проектами", () => {
  test("изменение статуса попало в журнал", async () => {
    const r = await GET("/api/audit?limit=200")
    const found = r.data.logs.find(
      (l: any) => l.entityType === "Project" && l.action === "UPDATE",
    )
    expect(found).toBeDefined()
  })

  test("синхронизация с Bitrix24 попала в журнал", async () => {
    const r = await GET("/api/audit?limit=200")
    const found = r.data.logs.find(
      (l: any) =>
        l.entityType === "Project" &&
        l.entityName?.includes("Синхронизация"),
    )
    expect(found).toBeDefined()
    const details = JSON.parse(found.details)
    expect(details.source).toBe("bitrix24")
  })
})
