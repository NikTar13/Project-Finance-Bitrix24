"use client"

// ============================================================================
//  Лёгкий клиентский роутер (Zustand). Так как среда ограничена одним URL `/`,
//  навигация по разделам реализована через состояние, а не через React Router.
//  Это даёт тот же UX, что и SPA-навигация в приложении Bitrix24.
// ============================================================================

import { create } from "zustand"

export type ViewKey =
  | "dashboard"
  | "projects"
  | "project-detail"
  | "income"
  | "expenses"
  | "categories"
  | "employees"
  | "audit"

interface AppState {
  view: ViewKey
  selectedProjectId: string | null
  // мобильный сайдбар
  sidebarOpen: boolean
  setView: (view: ViewKey) => void
  openProject: (id: string) => void
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  selectedProjectId: null,
  sidebarOpen: false,
  setView: (view) => set({ view, sidebarOpen: false }),
  openProject: (id) => set({ view: "project-detail", selectedProjectId: id, sidebarOpen: false }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

export const NAV_ITEMS: { key: ViewKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Главная", icon: "home" },
  { key: "projects", label: "Проекты", icon: "folder" },
  { key: "income", label: "Доходы", icon: "trending-up" },
  { key: "expenses", label: "Расходы", icon: "trending-down" },
  { key: "categories", label: "Статьи", icon: "tags" },
  { key: "employees", label: "Сотрудники", icon: "users" },
  { key: "audit", label: "Журнал", icon: "history" },
]
