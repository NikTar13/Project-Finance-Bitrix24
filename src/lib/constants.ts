// ============================================================================
//  Типобезопасные константы-перечисления (SQLite не поддерживает enum).
//  При миграции на PostgreSQL можно вернуть enum в schema.prisma.
// ============================================================================

export const ROLES = {
  ADMIN: "ADMIN",
  FINANCIER: "FINANCIER",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const
export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Администратор",
  FINANCIER: "Финансист",
  MANAGER: "Менеджер проекта",
  EMPLOYEE: "Сотрудник",
}

export const PROJECT_STATUSES = {
  ACTIVE: "ACTIVE",
  ON_HOLD: "ON_HOLD",
  CLOSED: "CLOSED",
} as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[keyof typeof PROJECT_STATUSES]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "Активен",
  ON_HOLD: "На паузе",
  CLOSED: "Закрыт",
}

export const PROJECT_ROLES = {
  PROJECT_MANAGER: "PROJECT_MANAGER",
  DEVELOPER: "DEVELOPER",
  QA: "QA",
  DESIGNER: "DESIGNER",
  ANALYST: "ANALYST",
} as const
export type ProjectRole = (typeof PROJECT_ROLES)[keyof typeof PROJECT_ROLES]

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  PROJECT_MANAGER: "Менеджер проекта",
  DEVELOPER: "Разработчик",
  QA: "Тестировщик",
  DESIGNER: "Дизайнер",
  ANALYST: "Аналитик",
}

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
} as const
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Создание",
  UPDATE: "Изменение",
  DELETE: "Удаление",
}

// Предустановленные статьи расходов по ТЗ + цвета для графиков
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Внешние программисты", color: "#2fc7f7" },
  { name: "Внутренние программисты", color: "#1e9bd8" },
  { name: "Расходы на ИИ", color: "#a855f7" },
  { name: "Аренда сервера", color: "#f59e0b" },
  { name: "Дивиденды", color: "#ef4444" },
] as const

export const DEFAULT_INCOME_CATEGORIES = [
  "Оплата этапа",
  "Предоплата",
  "Финальный платёж",
  "Другое",
] as const
