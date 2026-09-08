"use client"

import { History, User as UserIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
import { DateTimeText } from "../format"
import { useAudit } from "@/lib/api"
import { AUDIT_ACTION_LABELS, type AuditAction } from "@/lib/constants"

const actionStyle: Record<AuditAction, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPDATE: "bg-sky-50 text-sky-700 border-sky-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
}

function entityLabel(type: string): string {
  const map: Record<string, string> = {
    Income: "Доход",
    Expense: "Расход",
    Project: "Проект",
    IncomeCategory: "Статья дохода",
    ExpenseCategory: "Статья расхода",
    ProjectUser: "Сотрудник проекта",
    System: "Система",
  }
  return map[type] ?? type
}

export function AuditView() {
  const { data, isLoading, isError, error } = useAudit()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Журнал действий"
        description="Кто, когда и что изменил. Все операции с доходами, расходами и проектами фиксируются."
        icon={<History className="h-5 w-5" />}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">История изменений</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <ErrorState message={error?.message ?? "Ошибка"} />
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState icon={History} title="Записей пока нет" />
          ) : (
            <div className="overflow-x-auto scroll-thin max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-40">Когда</TableHead>
                    <TableHead className="w-40">Пользователь</TableHead>
                    <TableHead className="w-28">Действие</TableHead>
                    <TableHead className="w-36">Объект</TableHead>
                    <TableHead>Детали</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.map((log) => {
                    let details: Record<string, unknown> = {}
                    try {
                      details = JSON.parse(log.details)
                    } catch {
                      // игнорируем ошибку парсинга
                    }
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          <DateTimeText value={log.createdAt} />
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {log.userName ?? "Система"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-medium ${actionStyle[log.action]}`}
                          >
                            {AUDIT_ACTION_LABELS[log.action]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-muted-foreground">{entityLabel(log.entityType)}</div>
                            {log.entityName && (
                              <div className="truncate max-w-[200px] text-foreground">
                                {log.entityName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <DetailsCell details={details} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details).filter(([k]) => k !== "changes")
  const changes = details.changes as Record<string, unknown> | undefined
  return (
    <div className="space-y-0.5">
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {entries.map(([k, v]) => (
            <span key={k}>
              <span className="text-muted-foreground/70">{k}:</span>{" "}
              {formatVal(v)}
            </span>
          ))}
        </div>
      )}
      {changes && Object.keys(changes).length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="text-muted-foreground/70">изменено:</span>
          {Object.entries(changes).map(([k]) => (
            <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "number") return v.toLocaleString("ru-RU")
  if (typeof v === "string") return v
  return JSON.stringify(v)
}
