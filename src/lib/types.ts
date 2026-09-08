// ============================================================================
//  Общие типы API-ответов. Используются и на сервере, и на клиенте.
//  Все суммы в ответах — в рублях (number) для удобства фронтенда.
// ============================================================================

import type { Role, ProjectStatus, ProjectRole, AuditAction } from "./constants"

export interface UserDTO {
  id: string
  bitrixUserId: string
  email: string
  name: string
  position: string | null
  avatarUrl: string | null
  role: Role
  isActive: boolean
}

export interface ProjectDTO {
  id: string
  bitrixProjectId: string
  name: string
  description: string | null
  status: ProjectStatus
  startedAt: string | null
  closedAt: string | null
  // агрегаты (в рублях)
  income: number
  expense: number
  profit: number
  profitability: number | null
  employeesCount: number
}

export interface ProjectUserDTO {
  id: string
  userId: string
  projectRole: ProjectRole
  assignedAt: string
  user: UserDTO
}

export interface ProjectDetailDTO extends ProjectDTO {
  employees: ProjectUserDTO[]
}

export interface IncomeCategoryDTO {
  id: string
  name: string
  isDefault: boolean
}

export interface ExpenseCategoryDTO {
  id: string
  name: string
  isDefault: boolean
  color: string | null
}

export interface IncomeDTO {
  id: string
  projectId: string
  projectName: string
  amount: number // рубли
  date: string
  categoryId: string
  categoryName: string
  comment: string | null
  createdByName: string | null
  createdAt: string
}

export interface ExpenseDTO {
  id: string
  projectId: string
  projectName: string
  amount: number // рубли
  date: string
  categoryId: string
  categoryName: string
  color: string | null
  comment: string | null
  createdByName: string | null
  createdAt: string
}

export interface AuditLogDTO {
  id: string
  userName: string | null
  action: AuditAction
  actionLabel: string
  entityType: string
  entityId: string | null
  entityName: string | null
  details: string
  createdAt: string
}

export interface DashboardDTO {
  projectsCount: number
  activeProjectsCount: number
  totalIncome: number
  totalExpense: number
  totalProfit: number
  totalProfitability: number | null
  // расходы по статьям (для графика)
  expensesByCategory: { name: string; color: string; amount: number }[]
  // прибыль по месяцам (последние 6)
  profitByMonth: { month: string; income: number; expense: number; profit: number }[]
  // последние операции
  recentTransactions: {
    id: string
    type: "income" | "expense"
    date: string
    amount: number
    categoryName: string
    projectName: string
    projectId: string
  }[]
}
