// GET /api/auth/me — текущий пользователь (имитация Bitrix24 SSO)
// POST /api/auth/me — сменить текущего пользователя (демо многопользовательности)
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, setCurrentUserCookie, toUserDTO } from "@/lib/current-user"

export const dynamic = "force-dynamic"

export async function GET() {
  const cur = await getCurrentUser()
  const user = await db.user.findUnique({ where: { id: cur.id } })
  if (!user) return NextResponse.json({ error: "Не найден" }, { status: 404 })
  return NextResponse.json({ user: toUserDTO(user) })
}

export async function POST(req: Request) {
  const { userId } = await req.json().catch(() => ({}))
  if (typeof userId !== "string") {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 })
  }
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }
  await setCurrentUserCookie(user.id)
  return NextResponse.json({ user: toUserDTO(user) })
}
