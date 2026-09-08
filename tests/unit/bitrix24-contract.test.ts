// ============================================================================
//  Тесты контракта Bitrix24 (src/lib/bitrix24.ts).
//
//  Цель: гарантировать, что структура ответов mock соответствует реальному
//  REST API Bitrix24 (user.get, sonet_group.get). При подключении реального
//  портала нужно заменить только тела функций — типы останутся прежними,
//  и весь остальной код продолжит работать.
//
//  Поля сверены с официальной документацией Bitrix24 REST:
//    - user.get: ID, EMAIL, NAME, LAST_NAME, WORK_POSITION, PERSONAL_PHOTO, ACTIVE
//    - sonet_group.get: ID, NAME, DESCRIPTION, PROJECT, DATE_CREATE, DATE_START,
//                       DATE_END, CLOSED
// ============================================================================

import { test, expect, describe } from "bun:test"
import { bitrixUsersGet, bitrixProjectsGet, bitrix24 } from "../../src/lib/bitrix24"

describe("Bitrix24 user.get — контракт ответа", () => {
  test("возвращает массив пользователей", async () => {
    const users = await bitrixUsersGet()
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)
  })

  test("каждый пользователь содержит все обязательные поля", async () => {
    const users = await bitrixUsersGet()
    for (const u of users) {
      // Эти поля использует наш seed/mappers — они обязаны присутствовать
      expect(typeof u.ID).toBe("string")
      expect(typeof u.EMAIL).toBe("string")
      expect(typeof u.NAME).toBe("string")
      expect(typeof u.LAST_NAME).toBe("string")
      expect(u.WORK_POSITION === null || typeof u.WORK_POSITION === "string").toBe(true)
      expect(u.PERSONAL_PHOTO === null || typeof u.PERSONAL_PHOTO === "string").toBe(true)
      expect(typeof u.ACTIVE).toBe("boolean")
    }
  })

  test("ID пользователей уникальны", async () => {
    const users = await bitrixUsersGet()
    const ids = users.map((u) => u.ID)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("EMAIL уникальны (требование Bitrix24)", async () => {
    const users = await bitrixUsersGet()
    const emails = users.map((u) => u.EMAIL)
    expect(new Set(emails).size).toBe(emails.length)
  })

  test("все пользователи активны (фильтр ACTIVE=true)", async () => {
    const users = await bitrixUsersGet()
    for (const u of users) {
      expect(u.ACTIVE).toBe(true)
    }
  })
})

describe("Bitrix24 sonet_group.get — контракт ответа", () => {
  test("возвращает массив проектов/групп", async () => {
    const projects = await bitrixProjectsGet()
    expect(Array.isArray(projects)).toBe(true)
    expect(projects.length).toBeGreaterThan(0)
  })

  test("каждый проект содержит все обязательные поля", async () => {
    const projects = await bitrixProjectsGet()
    for (const p of projects) {
      expect(typeof p.ID).toBe("string")
      expect(typeof p.NAME).toBe("string")
      expect(typeof p.PROJECT).toBe("string") // "Y" | "N"
      expect(typeof p.DATE_CREATE).toBe("string")
      expect(typeof p.CLOSED).toBe("string") // "Y" | "N"
      expect(p.DESCRIPTION === null || typeof p.DESCRIPTION === "string").toBe(true)
      expect(p.DATE_START === null || typeof p.DATE_START === "string").toBe(true)
      expect(p.DATE_END === null || typeof p.DATE_END === "string").toBe(true)
    }
  })

  test("ID проектов уникальны", async () => {
    const projects = await bitrixProjectsGet()
    const ids = projects.map((p) => p.ID)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("CLOSED принимает только 'Y' или 'N'", async () => {
    const projects = await bitrixProjectsGet()
    for (const p of projects) {
      expect(["Y", "N"]).toContain(p.CLOSED)
    }
  })

  test("есть хотя бы один активный и хотя бы один закрытый проект", async () => {
    const projects = await bitrixProjectsGet()
    const closed = projects.filter((p) => p.CLOSED === "Y")
    const active = projects.filter((p) => p.CLOSED === "N")
    expect(active.length).toBeGreaterThan(0)
    expect(closed.length).toBeGreaterThan(0)
  })

  test("DATE_CREATE — валидная ISO-дата (используется в seed)", async () => {
    const projects = await bitrixProjectsGet()
    for (const p of projects) {
      const d = new Date(p.DATE_CREATE)
      expect(d.toString()).not.toBe("Invalid Date")
    }
  })
})

describe("Bitrix24 — API модуля", () => {
  test("bitrix24.users.list() — алиас bitrixUsersGet()", async () => {
    const a = await bitrix24.users.list()
    const b = await bitrixUsersGet()
    expect(a).toEqual(b)
  })

  test("bitrix24.projects.list() — алиас bitrixProjectsGet()", async () => {
    const a = await bitrix24.projects.list()
    const b = await bitrixProjectsGet()
    expect(a).toEqual(b)
  })
})
