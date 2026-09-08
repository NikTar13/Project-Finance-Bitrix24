"use client"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Trash2,
  CalendarDays,
  MessageSquare,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { PageHeader } from "../page-header"
import { EmptyState, ErrorState } from "../empty-state"
import { Money, DateText } from "../format"
import { TransactionFormDialog } from "../transaction-form-dialog"
import {
  useIncomes,
  useExpenses,
  useProjects,
  useDeleteIncome,
  useDeleteExpense,
} from "@/lib/api"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"

export function TransactionsView({ type }: { type: "income" | "expense" }) {
  const isIncome = type === "income"
  const openProject = useAppStore((s) => s.openProject)
  const [projectId, setProjectId] = useState<string>("all")
  const { data: projects } = useProjects()
  const incomeQ = useIncomes(projectId === "all" ? undefined : projectId)
  const expenseQ = useExpenses(projectId === "all" ? undefined : projectId)
  const data = isIncome ? incomeQ.data : expenseQ.data
  const isLoading = isIncome ? incomeQ.isLoading : expenseQ.isLoading
  const isError = isIncome ? incomeQ.isError : expenseQ.isError
  const error = isIncome ? incomeQ.error : expenseQ.error

  const deleteIncome = useDeleteIncome()
  const deleteExpense = useDeleteExpense()
  const remove = isIncome ? deleteIncome : deleteExpense
  const [toDelete, setToDelete] = useState<string | null>(null)

  const items = (data ?? []) as Array<{
    id: string
    amount: number
    date: string
    projectName: string
    projectId: string
    categoryName: string
    comment: string | null
    createdByName: string | null
  }>

  const total = items.reduce((s, it) => s + it.amount, 0)

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
    <div className="space-y-6">
      <PageHeader
        title={isIncome ? "Доходы" : "Расходы"}
        description={isIncome ? "Ручной учёт доходов по проектам" : "Ручной учёт расходов по проектам"}
        icon={
          isIncome ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />
        }
        actions={<TransactionFormDialog type={type} />}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">
            Всего записей: {items.length}
          </CardTitle>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              {isIncome ? "Сумма доходов" : "Сумма расходов"}:{" "}
            </span>
            <span className={`font-semibold tabular-nums ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
              <Money value={total} />
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72 scroll-thin">
                <SelectItem value="all">Все проекты</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isError ? (
            <ErrorState message={error?.message ?? "Ошибка"} />
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={isIncome ? TrendingUp : TrendingDown}
              title={isIncome ? "Доходов нет" : "Расходов нет"}
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
                    <TableHead>Проект</TableHead>
                    <TableHead>Статья</TableHead>
                    <TableHead>Комментарий</TableHead>
                    <TableHead className="w-32">Автор</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow
                      key={it.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openProject(it.projectId)}
                    >
                      <TableCell className="text-muted-foreground">
                        <DateText value={it.date} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {it.projectName}
                      </TableCell>
                      <TableCell>{it.categoryName}</TableCell>
                      <TableCell className="max-w-[220px]">
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Действие необратимо. Изменение будет зафиксировано в журнале аудита.
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
    </div>
  )
}
