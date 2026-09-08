// ============================================================================
//  Мапперы: записи БД → DTO (суммы в рублях для фронтенда).
//  Агрегаты доходов/расходов считаются на сервере — единый источник правды.
// ============================================================================

import { db } from "./db"
import { kopecksToRubles, profitability, profit } from "./money"
import type {
  ProjectDTO,
  ProjectDetailDTO,
  IncomeDTO,
  ExpenseDTO,
  UserDTO,
  ProjectUserDTO,
  AuditLogDTO,
  IncomeCategoryDTO,
  ExpenseCategoryDTO,
} from "./types"
import { toUserDTO } from "./current-user"
import {
  AUDIT_ACTION_LABELS,
  PROJECT_STATUS_LABELS,
} from "./constants"
import type { AuditAction } from "./constants"

/** Сумма доходов и расходов по проекту (в копейках). */
export async function getProjectAggregates(projectId: string) {
  const [incomeAgg, expenseAgg] = await Promise.all([
    db.income.aggregate({ _sum: { amount: true }, where: { projectId } }),
    db.expense.aggregate({ _sum: { amount: true }, where: { projectId } }),
  ])
  const incomeK = incomeAgg._sum.amount ?? 0
  const expenseK = expenseAgg._sum.amount ?? 0
  return {
    incomeK,
    expenseK,
    profitK: profit(incomeK, expenseK),
    profitability: profitability(incomeK, expenseK),
  }
}

export async function projectToDTO(p: {
  id: string
  bitrixProjectId: string
  name: string
  description: string | null
  status: string
  startedAt: Date | null
  closedAt: Date | null
}): Promise<ProjectDTO> {
  const agg = await getProjectAggregates(p.id)
  const employeesCount = await db.projectUser.count({ where: { projectId: p.id } })
  return {
    id: p.id,
    bitrixProjectId: p.bitrixProjectId,
    name: p.name,
    description: p.description,
    status: p.status as ProjectDTO["status"],
    startedAt: p.startedAt?.toISOString() ?? null,
    closedAt: p.closedAt?.toISOString() ?? null,
    income: kopecksToRubles(agg.incomeK),
    expense: kopecksToRubles(agg.expenseK),
    profit: kopecksToRubles(agg.profitK),
    profitability: agg.profitability,
    employeesCount,
  }
}

export async function projectToDetailDTO(p: {
  id: string
  bitrixProjectId: string
  name: string
  description: string | null
  status: string
  startedAt: Date | null
  closedAt: Date | null
}): Promise<ProjectDetailDTO> {
  const [dto, assignments] = await Promise.all([
    projectToDTO(p),
    db.projectUser.findMany({
      where: { projectId: p.id },
      include: { user: true },
      orderBy: { assignedAt: "asc" },
    }),
  ])
  const employees: ProjectUserDTO[] = assignments.map((a) => ({
    id: a.id,
    userId: a.userId,
    projectRole: a.projectRole as ProjectUserDTO["projectRole"],
    assignedAt: a.assignedAt.toISOString(),
    user: toUserDTO(a.user),
  }))
  return { ...dto, employees }
}

export function incomeToDTO(i: {
  id: string
  projectId: string
  amount: number
  date: Date
  categoryId: string
  comment: string | null
  createdAt: Date
  project: { name: string }
  category: { name: string }
  createdBy: { name: string } | null
}): IncomeDTO {
  return {
    id: i.id,
    projectId: i.projectId,
    projectName: i.project.name,
    amount: kopecksToRubles(i.amount),
    date: i.date.toISOString(),
    categoryId: i.categoryId,
    categoryName: i.category.name,
    comment: i.comment,
    createdByName: i.createdBy?.name ?? null,
    createdAt: i.createdAt.toISOString(),
  }
}

export function expenseToDTO(e: {
  id: string
  projectId: string
  amount: number
  date: Date
  categoryId: string
  comment: string | null
  createdAt: Date
  project: { name: string }
  category: { name: string; color: string | null }
  createdBy: { name: string } | null
}): ExpenseDTO {
  return {
    id: e.id,
    projectId: e.projectId,
    projectName: e.project.name,
    amount: kopecksToRubles(e.amount),
    date: e.date.toISOString(),
    categoryId: e.categoryId,
    categoryName: e.category.name,
    color: e.category.color,
    comment: e.comment,
    createdByName: e.createdBy?.name ?? null,
    createdAt: e.createdAt.toISOString(),
  }
}

export function auditToDTO(a: {
  id: string
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  details: string
  createdAt: Date
  user: { name: string } | null
}): AuditLogDTO {
  return {
    id: a.id,
    userName: a.user?.name ?? null,
    action: a.action as AuditAction,
    actionLabel: AUDIT_ACTION_LABELS[a.action as AuditAction] ?? a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    entityName: a.entityName,
    details: a.details,
    createdAt: a.createdAt.toISOString(),
  }
}

export function incomeCategoryToDTO(c: {
  id: string
  name: string
  isDefault: boolean
}): IncomeCategoryDTO {
  return { id: c.id, name: c.name, isDefault: c.isDefault }
}

export function expenseCategoryToDTO(c: {
  id: string
  name: string
  isDefault: boolean
  color: string | null
}): ExpenseCategoryDTO {
  return { id: c.id, name: c.name, isDefault: c.isDefault, color: c.color }
}

export { PROJECT_STATUS_LABELS }
