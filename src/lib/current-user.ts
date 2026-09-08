// ============================================================================
//  Определение текущего пользователя.
//
//  В реальном приложении Bitrix24 текущий пользователь приходит из JWT,
//  полученного после OAuth-установки приложения в портал.
//  Здесь симулируем это через cookie `pf_b24_user` (ID пользователя в нашей БД).
//  Если cookie нет — берём первого администратора (имитация "входа").
// ============================================================================

import { cookies } from "next/headers"
import { db } from "./db"
import { ROLES, type Role } from "./constants"
import type { UserDTO } from "./types"

const COOKIE_NAME = "pf_b24_user"

export async function getCurrentUserId(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value ?? null
}

export async function setCurrentUserCookie(userId: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
}

export function getCurrentUserCookieName() {
  return COOKIE_NAME
}

/** Возвращает текущего пользователя; если не задан — первого администратора. */
export async function getCurrentUser(): Promise<{ id: string; name: string; role: Role }> {
  const cookieId = await getCurrentUserId()
  if (cookieId) {
    const u = await db.user.findUnique({ where: { id: cookieId } })
    if (u && u.isActive) return { id: u.id, name: u.name, role: u.role as Role }
  }
  const admin = await db.user.findFirst({
    where: { role: ROLES.ADMIN, isActive: true },
    orderBy: { createdAt: "asc" },
  })
  if (admin) return { id: admin.id, name: admin.name, role: admin.role as Role }
  const anyUser = await db.user.findFirst({ where: { isActive: true } })
  if (anyUser) return { id: anyUser.id, name: anyUser.name, role: anyUser.role as Role }
  throw new Error("В системе нет ни одного пользователя. Выполните seed.")
}

export function toUserDTO(u: {
  id: string
  bitrixUserId: string
  email: string
  name: string
  position: string | null
  avatarUrl: string | null
  role: string
  isActive: boolean
}): UserDTO {
  return {
    id: u.id,
    bitrixUserId: u.bitrixUserId,
    email: u.email,
    name: u.name,
    position: u.position,
    avatarUrl: u.avatarUrl,
    role: u.role as Role,
    isActive: u.isActive,
  }
}
