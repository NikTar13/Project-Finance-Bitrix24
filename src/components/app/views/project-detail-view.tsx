"use client"

import { useState } from "react"
import {
  ArrowLeft,
  FolderKanban,
  Users,
  TrendingUp,
  TrendingDown,
  Trash2,
  UserPlus,
  CalendarDays,
  MessageSquare,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { FinanceSummary } from "../finance-summary"
import { EmptyState, ErrorState } from "../empty-state"
import { StatusBadge, ProjectRoleBadge } from "../badges"
import { Money, DateText } from "../format"
import { TransactionFormDialog } from "../transaction-form-dialog"
import {
  useProject,
  useIncomes,
  useExpenses,
  useEmployees,
  useAssignEmployee,
  useRemoveEmployee,
  useDeleteIncome,
  useDeleteExpense,
} from "@/lib/api"
import { useAppStore } from "@/lib/store"
import { PROJECT_ROLES, type ProjectRole } from "@/lib/constants"
import { toast } from "sonner"

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
}

export function ProjectDetailView() {
  const id = useAppStore((s) => s.selectedProjectId)
  const setView = useAppStore((s) => s.setView)
  const { data: project, isLoading, isError, error } = useProject(id)

  if (!id) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Проект не выбран"
        description="Вернитесь к списку проектов и выберите карточку."
        action={<Button onClick={() => setView("projects")}>К проектам</Button>}
      />
    )
  }
  if (isError) return <ErrorState message={error?.message ?? "Ошибка"} />
  if (isLoading || !project) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView("projects")} aria-label="Назад">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight truncate">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
      </div>

      <FinanceSummary
        income={project.income}
        expense={project.expense}
        profit={project.profit}
        profitability={project.profitability}
      />

      <Tabs defaultValue="income">
        <TabsList>
          <TabsTrigger value="income" className="gap-1.5">
            <TrendingUp className="h-4 w-4" /> Доходы
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-1.5">
            <TrendingDown className="h-4 w-4" /> Расходы
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="h-4 w-4" /> Сотрудники ({project.employees.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <ProjectTransactions type="income" projectId={project.id} />
        </TabsContent>
        <TabsContent value="expense">
          <ProjectTransactions type="expense" projectId={project.id} />
        </TabsContent>
        <TabsContent value="team">
          <ProjectTeam projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProjectTransactions({
  type,
  projectId,
}: {
  type: "income" | "expense"
  projectId: string
}) {
  const isIncome = type === "income"
  const incomeQ = useIncomes(projectId)
  const expenseQ = useExpenses(projectId)
  const { data, isLoading } = isIncome ? incomeQ : expenseQ
  const deleteIncome = useDeleteIncome()
  const deleteExpense = useDeleteExpense()
  const [toDelete, setToDelete] = useState<string | null>(null)

  const items = (data ?? []) as Array<{
    id: string
    amount: number
    date: string
    categoryName: string
    comment: string | null
    createdByName: string | null
  }>

  const remove = isIncome ? deleteIncome : deleteExpense

  function confirmDelete() {
    if (!toDelete) return
    remove.mutate(toDelete, {
      onSuccess: () => {
        toast.success(isIncome ? "Доход удалён" : "Расход удалён")
        setToDelete(null)
      },
      onError: (e) => toast.error(`Ошибка: ${(e as Error).message}`),
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          {isIncome ? "Доходы проекта" : "Расходы проекта"}
        </CardTitle>
        <TransactionFormDialog type={type} defaultProjectId={projectId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={isIncome ? TrendingUp : TrendingDown}
            title={isIncome ? "Доходов пока нет" : "Расходов пока нет"}
            description="Добавьте первую запись ручного учёта."
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> Дата
                    </span>
                  </TableHead>
                  <TableHead>Статья</TableHead>
                  <TableHead>Комментарий</TableHead>
                  <TableHead className="w-32">Автор</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-muted-foreground">
                      <DateText value={it.date} />
                    </TableCell>
                    <TableCell className="font-medium">{it.categoryName}</TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        {it.comment ? (
                          <>
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{it.comment}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {it.createdByName ?? "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold tabular-nums ${
                        isIncome ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "−"}
                      <Money value={it.amount} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => setToDelete(it.id)}
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Действие необратимо. Запись будет удалена, изменение попадёт в журнал аудита.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function ProjectTeam({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId)
  const { data: allEmployees } = useEmployees()
  const assign = useAssignEmployee(projectId)
  const remove = useRemoveEmployee(projectId)

  const [userId, setUserId] = useState("")
  const [role, setRole] = useState<ProjectRole>(PROJECT_ROLES.DEVELOPER)

  const assignedIds = new Set((project?.employees ?? []).map((e) => e.userId))
  const available = (allEmployees ?? []).filter((u) => !assignedIds.has(u.id))

  function handleAssign() {
    if (!userId) return toast.error("Выберите сотрудника")
    assign.mutate(
      { userId, projectRole: role },
      {
        onSuccess: () => {
          toast.success("Сотрудник назначен")
          setUserId("")
        },
        onError: (e) => toast.error(`Ошибка: ${(e as Error).message}`),
      },
    )
  }

  function handleRemove(assignId: string, name: string) {
    remove.mutate(assignId, {
      onSuccess: () => toast.success(`${name} снят с проекта`),
      onError: (e) => toast.error(`Ошибка: ${(e as Error).message}`),
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Команда проекта</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Назначение */}
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Сотрудник (из Bitrix24)</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent className="max-h-72 scroll-thin">
                {available.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Все уже назначены
                  </SelectItem>
                ) : (
                  available.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.position}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-52 space-y-1">
            <label className="text-xs text-muted-foreground">Роль в проекте</label>
            <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PROJECT_ROLES).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "PROJECT_MANAGER"
                      ? "Менеджер проекта"
                      : r === "DEVELOPER"
                        ? "Разработчик"
                        : r === "QA"
                          ? "Тестировщик"
                          : r === "DESIGNER"
                            ? "Дизайнер"
                            : "Аналитик"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssign} disabled={assign.isPending || !userId || userId === "_none"}>
            <UserPlus className="h-4 w-4" />
            Назначить
          </Button>
        </div>

        {/* Список */}
        {(project?.employees ?? []).length === 0 ? (
          <EmptyState
            icon={Users}
            title="Команда пуста"
            description="Назначьте сотрудников на проект из списка пользователей Bitrix24."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {project?.employees.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials(e.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{e.user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{e.user.position}</div>
                </div>
                <ProjectRoleBadge role={e.projectRole} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  onClick={() => handleRemove(e.id, e.user.name)}
                  aria-label="Снять с проекта"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
