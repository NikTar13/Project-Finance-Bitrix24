"use client"

// ============================================================================
//  API-клиент и React Query хуки. Единая точка обращения к REST API.
//  Все суммы с бэкенда — в рублях.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  DashboardDTO,
  ProjectDTO,
  ProjectDetailDTO,
  IncomeDTO,
  ExpenseDTO,
  IncomeCategoryDTO,
  ExpenseCategoryDTO,
  UserDTO,
  AuditLogDTO,
  ProjectRole,
  ProjectStatus,
} from "./types"

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? `HTTP ${res.status}`, res.status)
  }
  return data as T
}

// --- Ключи кэша (React Query) --------------------------------------------
export const qk = {
  dashboard: ["dashboard"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
  incomes: (projectId?: string) => ["incomes", projectId ?? "all"] as const,
  expenses: (projectId?: string) => ["expenses", projectId ?? "all"] as const,
  categories: ["categories"] as const,
  employees: ["employees"] as const,
  audit: ["audit"] as const,
  me: ["auth", "me"] as const,
}

// --- Запросы (чтение) ----------------------------------------------------

export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: () => apiFetch<DashboardDTO>("/api/dashboard"),
  })
}

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: () => apiFetch<{ projects: ProjectDTO[] }>("/api/projects").then((r) => r.projects),
  })
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: id ? qk.project(id) : ["project", "none"],
    enabled: !!id,
    queryFn: () => apiFetch<{ project: ProjectDetailDTO }>(`/api/projects/${id}`).then((r) => r.project),
  })
}

export function useIncomes(projectId?: string) {
  return useQuery({
    queryKey: qk.incomes(projectId),
    queryFn: () =>
      apiFetch<{ incomes: IncomeDTO[] }>(`/api/income${projectId ? `?projectId=${projectId}` : ""}`).then(
        (r) => r.incomes,
      ),
  })
}

export function useExpenses(projectId?: string) {
  return useQuery({
    queryKey: qk.expenses(projectId),
    queryFn: () =>
      apiFetch<{ expenses: ExpenseDTO[] }>(`/api/expenses${projectId ? `?projectId=${projectId}` : ""}`).then(
        (r) => r.expenses,
      ),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () =>
      apiFetch<{ income: IncomeCategoryDTO[]; expense: ExpenseCategoryDTO[] }>("/api/categories"),
  })
}

export function useEmployees() {
  return useQuery({
    queryKey: qk.employees,
    queryFn: () => apiFetch<{ employees: (UserDTO & { projectsCount: number })[] }>("/api/employees").then(
      (r) => r.employees,
    ),
  })
}

export function useAudit() {
  return useQuery({
    queryKey: qk.audit,
    queryFn: () => apiFetch<{ logs: AuditLogDTO[] }>("/api/audit").then((r) => r.logs),
  })
}

export function useCurrentUser() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => apiFetch<{ user: UserDTO }>("/api/auth/me").then((r) => r.user),
  })
}

// --- Мутации (запись) ----------------------------------------------------

type Invalidate = (qc: ReturnType<typeof useQueryClient>) => void

function useTypedMutation<TVars, TRes>(
  mutationFn: (vars: TVars) => Promise<TRes>,
  onInvalidate: Invalidate,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => onInvalidate(qc),
  })
}

// Доходы
export function useCreateIncome() {
  return useTypedMutation(
    (v: {
      projectId: string
      amount: number
      date: string
      categoryId: string
      comment?: string
    }) => apiFetch<{ income: IncomeDTO }>("/api/income", { method: "POST", body: JSON.stringify(v) }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.dashboard })
      qc.invalidateQueries({ queryKey: qk.projects })
      qc.invalidateQueries({ queryKey: ["incomes"] })
      qc.invalidateQueries({ queryKey: ["project"] })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

export function useDeleteIncome() {
  return useTypedMutation(
    (id: string) => apiFetch(`/api/income/${id}`, { method: "DELETE" }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.dashboard })
      qc.invalidateQueries({ queryKey: qk.projects })
      qc.invalidateQueries({ queryKey: ["incomes"] })
      qc.invalidateQueries({ queryKey: ["project"] })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

// Расходы
export function useCreateExpense() {
  return useTypedMutation(
    (v: {
      projectId: string
      amount: number
      date: string
      categoryId: string
      comment?: string
    }) => apiFetch<{ expense: ExpenseDTO }>("/api/expenses", { method: "POST", body: JSON.stringify(v) }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.dashboard })
      qc.invalidateQueries({ queryKey: qk.projects })
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["project"] })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

export function useDeleteExpense() {
  return useTypedMutation(
    (id: string) => apiFetch(`/api/expenses/${id}`, { method: "DELETE" }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.dashboard })
      qc.invalidateQueries({ queryKey: qk.projects })
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["project"] })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

// Категории
export function useCreateCategory() {
  return useTypedMutation(
    (v: { type: "income" | "expense"; name: string; color?: string }) =>
      apiFetch(`/api/categories`, { method: "POST", body: JSON.stringify(v) }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.categories })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

export function useDeleteCategory() {
  return useTypedMutation(
    (v: { id: string; type: "income" | "expense" }) =>
      apiFetch(`/api/categories/${v.id}?type=${v.type}`, { method: "DELETE" }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.categories })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

// Сотрудники на проекте
export function useAssignEmployee(projectId: string) {
  return useTypedMutation(
    (v: { userId: string; projectRole: ProjectRole }) =>
      apiFetch(`/api/projects/${projectId}/employees`, {
        method: "POST",
        body: JSON.stringify(v),
      }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.project(projectId) })
      qc.invalidateQueries({ queryKey: qk.employees })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

export function useRemoveEmployee(projectId: string) {
  return useTypedMutation(
    (assignId: string) =>
      apiFetch(`/api/projects/${projectId}/employees/${assignId}`, { method: "DELETE" }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.project(projectId) })
      qc.invalidateQueries({ queryKey: qk.employees })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

// Проект
export function useUpdateProject() {
  return useTypedMutation(
    (v: { id: string; status?: ProjectStatus; description?: string }) =>
      apiFetch<{ project: ProjectDetailDTO }>(`/api/projects/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: v.status, description: v.description }),
      }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.projects })
      qc.invalidateQueries({ queryKey: ["project"] })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

export function useSyncProjects() {
  return useTypedMutation(
    () => apiFetch<{ created: number; updated: number; total: number }>("/api/projects/sync", { method: "POST" }),
    (qc) => {
      qc.invalidateQueries({ queryKey: qk.projects })
      qc.invalidateQueries({ queryKey: qk.audit })
    },
  )
}

export function useSwitchUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{ user: UserDTO }>("/api/auth/me", { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })
}

export { ApiError }
