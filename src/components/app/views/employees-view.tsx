"use client"

import { Users, Mail, Briefcase, FolderKanban } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "../page-header"
import { EmptyState, ErrorState } from "../empty-state"
import { RoleBadge } from "../badges"
import { useEmployees } from "@/lib/api"

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
}

export function EmployeesView() {
  const { data, isLoading, isError, error } = useEmployees()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Сотрудники"
        description="Получены из Bitrix24 (user.get). Доступны для назначения на проекты."
        icon={<Users className="h-5 w-5" />}
      />

      {isError ? (
        <ErrorState message={error?.message ?? "Ошибка"} />
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={Users} title="Сотрудников нет" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data!.map((u) => (
            <Card key={u.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{u.name}</div>
                    <div className="mt-0.5">
                      <RoleBadge role={u.role} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{u.position ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                    <span>Проектов: {u.projectsCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
