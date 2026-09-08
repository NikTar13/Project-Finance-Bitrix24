"use client"

import { SidebarBrand, SidebarNav } from "./sidebar"
import { Header } from "./header"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-workspace">
      <div className="flex flex-1">
        {/* Десктоп-сайдбар */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 border-r border-sidebar-border bg-sidebar">
          <SidebarBrand />
          <div className="flex-1 overflow-y-auto scroll-thin py-2">
            <SidebarNav />
            <div className="mt-auto px-5 py-4 text-[11px] text-muted-foreground">
              <p>Локальное приложение Bitrix24</p>
              <p className="mt-0.5">Ручной учёт доходов и расходов</p>
            </div>
          </div>
        </aside>

        {/* Основная колонка */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background px-4 py-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <p>
          Project Finance для Bitrix24 — тестовое задание. Учёт доходов и расходов по проектам.
        </p>
        <p className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Рентабельность = Прибыль / Расход × 100%
        </p>
      </div>
    </footer>
  )
}
