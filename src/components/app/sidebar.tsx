"use client"

import {
  Home,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  Tags,
  Users,
  History,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore, NAV_ITEMS, type ViewKey } from "@/lib/store"

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  folder: FolderKanban,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  tags: Tags,
  users: Users,
  history: History,
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  // подсветка: проект-детейл относится к разделу "Проекты"
  const activeKey: ViewKey = view === "project-detail" ? "projects" : view

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? Home
        const active = activeKey === item.key
        return (
          <button
            key={item.key}
            onClick={() => {
              setView(item.key)
              onNavigate?.()
            }}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            )}
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#2fc7f7] to-[#1e9bd8] text-white shadow-sm">
        <Wallet className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-foreground">Project Finance</div>
        <div className="text-[11px] text-muted-foreground">для Bitrix24</div>
      </div>
    </div>
  )
}
