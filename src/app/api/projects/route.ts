// GET /api/projects — список проектов с агрегатами
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { projectToDTO } from "@/lib/mappers"

export const dynamic = "force-dynamic"

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })
  const dtos = await Promise.all(projects.map(projectToDTO))
  return NextResponse.json({ projects: dtos })
}
