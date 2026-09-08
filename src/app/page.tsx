"use client"

import { AppShell } from "@/components/app/app-shell"
import { useAppStore } from "@/lib/store"
import { DashboardView } from "@/components/app/views/dashboard-view"
import { ProjectsView } from "@/components/app/views/projects-view"
import { ProjectDetailView } from "@/components/app/views/project-detail-view"
import { IncomeView } from "@/components/app/views/income-view"
import { ExpensesView } from "@/components/app/views/expenses-view"
import { CategoriesView } from "@/components/app/views/categories-view"
import { EmployeesView } from "@/components/app/views/employees-view"
import { AuditView } from "@/components/app/views/audit-view"

export default function Home() {
  const view = useAppStore((s) => s.view)

  return (
    <AppShell>
      {view === "dashboard" && <DashboardView />}
      {view === "projects" && <ProjectsView />}
      {view === "project-detail" && <ProjectDetailView />}
      {view === "income" && <IncomeView />}
      {view === "expenses" && <ExpensesView />}
      {view === "categories" && <CategoriesView />}
      {view === "employees" && <EmployeesView />}
      {view === "audit" && <AuditView />}
    </AppShell>
  )
}
