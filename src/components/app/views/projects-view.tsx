"use client"

import { FolderKanban, RefreshCw, ArrowRight, Users, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "../page-header"
import { EmptyState, ErrorState } from "../empty-state"
import { StatusBadge } from "../badges"
import { Money, Percent, profitColor } from "../format"
import { useProjects, useSyncProjects } from "@/lib/api"
import { useAppStore } from "@/lib/store"
import { useState } from "react"
import { toast } from "sonner"

export function ProjectsView() {
  const { data: projects, isLoading, isError, error } = useProjects()
  const openProject = useAppStore((s) => s.openProject)
  const sync = useSyncProjects()
  const [q, setQ] = useState("")

  const filtered = (projects ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  )

  const totalIncome = (projects ?? []).reduce((s, p) => s + p.income, 0)
  const totalExpense = (projects ?? []).reduce((s, p) => s + p.expense, 0)
  const totalProfit = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <PageHeader
        title="Проекты"
        description="Проекты получены из Bitrix24. Финансы — ручной учёт."
        icon={<FolderKanban className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            disabled={sync.isPending}
            onClick={() =>
              sync.mutate(undefined, {
                onSuccess: (r) =>
                  toast.success(`Bitrix24: добавлено ${r.created}, обновлено ${r.updated}`),
                onError: (e) => toast.error(`Ошибка: ${(e as Error).message}`),
              })
            }
          >
            <RefreshCw className={`h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`} />
            Синхронизировать
          </Button>
        }
      />

      {/* Итоговая полоса */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 gap-0 shadow-sm">
          <p className="text-xs text-muted-foreground">Доход по всем проектам</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600 tabular-nums">
            <Money value={totalIncome} />
          </p>
        </Card>
        <Card className="p-4 gap-0 shadow-sm">
          <p className="text-xs text-muted-foreground">Расход по всем проектам</p>
          <p className="mt-1 text-xl font-semibold text-red-600 tabular-nums">
            <Money value={totalExpense} />
          </p>
        </Card>
        <Card className="p-4 gap-0 shadow-sm">
          <p className="text-xs text-muted-foreground">Прибыль</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${profitColor(totalProfit)}`}>
            <Money value={totalProfit} />
          </p>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8"
              />
            </div>
            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.length} из {projects?.length ?? 0}
            </span>
          </div>

          {isError ? (
            <ErrorState message={error?.message ?? "Ошибка"} />
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Проекты не найдены"
              description="Синхронизируйте проекты из Bitrix24 или измените запрос поиска."
            />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Проект</TableHead>
                    <TableHead className="w-28">Статус</TableHead>
                    <TableHead className="w-24 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> Команда
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Доход</TableHead>
                    <TableHead className="text-right">Расход</TableHead>
                    <TableHead className="text-right">Прибыль</TableHead>
                    <TableHead className="text-right">Рентаб.</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openProject(p.id)}
                    >
                      <TableCell className="font-medium max-w-[280px]">
                        <div className="truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.description ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{p.employeesCount}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">
                        <Money value={p.income} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-600">
                        <Money value={p.expense} />
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${profitColor(p.profit)}`}>
                        <Money value={p.profit} />
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${profitColor(p.profit)}`}>
                        <Percent value={p.profitability} />
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
