"use client"

import { useState } from "react"
import { Menu, RefreshCw, Check, ChevronDown, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useAppStore, NAV_ITEMS } from "@/lib/store"
import { useCurrentUser, useSwitchUser, useEmployees, useSyncProjects } from "@/lib/api"
import { RoleBadge } from "./badges"
import { SidebarNav, SidebarBrand } from "./sidebar"
import { toast } from "sonner"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function Header() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  const { data: me, isLoading } = useCurrentUser()
  const { data: employees } = useEmployees()
  const switchUser = useSwitchUser()
  const syncProjects = useSyncProjects()

  const [switching, setSwitching] = useState(false)

  const currentLabel =
    view === "project-detail"
      ? "Проекты"
      : NAV_ITEMS.find((n) => n.key === view)?.label ?? "Главная"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      {/* мобильное меню */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-base font-semibold text-foreground truncate">{currentLabel}</h2>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Синхронизация проектов из Bitrix24 */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          disabled={syncProjects.isPending}
          onClick={() => {
            syncProjects.mutate(undefined, {
              onSuccess: (r) =>
                toast.success(
                  `Синхронизация с Bitrix24: добавлено ${r.created}, обновлено ${r.updated}`,
                ),
              onError: (e) => toast.error(`Ошибка синхронизации: ${(e as Error).message}`),
            })
          }}
        >
          <RefreshCw className={`h-4 w-4 ${syncProjects.isPending ? "animate-spin" : ""}`} />
          Синхронизировать
        </Button>

        {/* Пользовательское меню */}
        {isLoading || !me ? (
          <Skeleton className="h-9 w-36 rounded-full" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 pr-3 hover:bg-muted/50 transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials(me.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                  {me.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="font-medium">{me.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{me.email}</span>
                <RoleBadge role={me.role} className="mt-1 w-fit" />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Сменить пользователя (демо многопользовательности)
              </DropdownMenuLabel>
              <div className="max-h-60 overflow-y-auto scroll-thin">
                {employees?.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => {
                      setSwitching(true)
                      switchUser.mutate(u.id, {
                        onSuccess: () => {
                          setSwitching(false)
                          toast.success(`Вошли как ${u.name}`)
                        },
                        onError: (e) => {
                          setSwitching(false)
                          toast.error(`Ошибка: ${(e as Error).message}`)
                        },
                      })
                    }}
                    disabled={switching || u.id === me.id}
                    className="gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-muted text-[10px] font-semibold">
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">{u.name}</span>
                    {u.id === me.id && <Check className="h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-muted-foreground"
                onClick={() => setView("audit")}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Открыть журнал действий
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Мобильный сайдбар (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Меню</SheetTitle>
          <SidebarBrand />
          <SidebarNav onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
