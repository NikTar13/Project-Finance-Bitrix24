"use client"

import {
  FolderKanban,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowRight,
  Plus,
} from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KpiCard } from "../kpi-card"
import { FinanceSummary } from "../finance-summary"
import { PageHeader } from "../page-header"
import { EmptyState, ErrorState, LoadingState } from "../empty-state"
import { Money, DateText, profitColor } from "../format"
import { useDashboard } from "@/lib/api"
import { useAppStore } from "@/lib/store"
import { formatRubles } from "@/lib/money"

export function DashboardView() {
  const { data, isLoading, isError, error } = useDashboard()
  const setView = useAppStore((s) => s.setView)
  const openProject = useAppStore((s) => s.openProject)

  if (isError) return <ErrorState message={error?.message ?? "Ошибка"} />
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Главная" description="Сводка по всем проектам" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Главная"
        description="Сводка по всем проектам Bitrix24"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => setView("projects")}>
            Все проекты
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Проектов"
          value={data.projectsCount}
          icon={FolderKanban}
          tone="primary"
          hint={`${data.activeProjectsCount} активных`}
        />
        <KpiCard
          label="Общий доход"
          value={<Money value={data.totalIncome} />}
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Общий расход"
          value={<Money value={data.totalExpense} />}
          icon={TrendingDown}
          tone="red"
        />
        <KpiCard
          label="Общая прибыль"
          value={<Money value={data.totalProfit} className={profitColor(data.totalProfit)} />}
          icon={Wallet}
          tone={data.totalProfit >= 0 ? "emerald" : "red"}
          hint={
            data.totalProfitability !== null
              ? `Рентабельность ${data.totalProfitability.toFixed(1)}%`
              : "Расходов нет"
          }
        />
      </div>

      {/* Графики */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Расходы по статьям
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.expensesByCategory.length === 0 ? (
              <EmptyState icon={PieChartIcon} title="Нет данных о расходах" className="py-8" />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.expensesByCategory}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {data.expensesByCategory.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatRubles(v)}
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full space-y-1.5">
                  {data.expensesByCategory.map((e) => {
                    const total = data.expensesByCategory.reduce((s, x) => s + x.amount, 0)
                    const pct = total > 0 ? (e.amount / total) * 100 : 0
                    return (
                      <div key={e.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                        <span className="flex-1 truncate text-muted-foreground">{e.name}</span>
                        <span className="tabular-nums font-medium">
                          <Money value={e.amount} />
                        </span>
                        <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Доходы и расходы по месяцам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.profitByMonth} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={48}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}к` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(v: number) => formatRubles(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Bar dataKey="income" name="Доход" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Расход" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Последние операции */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Последние операции</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="Операций пока нет"
              description="Добавьте первый доход или расход в соответствующем разделе."
            />
          ) : (
            <div className="overflow-x-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Проект</TableHead>
                    <TableHead>Статья</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTransactions.map((t) => (
                    <TableRow
                      key={`${t.type}-${t.id}`}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openProject(t.projectId)}
                    >
                      <TableCell className="text-muted-foreground">
                        <DateText value={t.date} />
                      </TableCell>
                      <TableCell>
                        {t.type === "income" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            Доход
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-50">
                            Расход
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate font-medium">{t.projectName}</TableCell>
                      <TableCell className="text-muted-foreground">{t.categoryName}</TableCell>
                      <TableCell
                        className={`text-right font-semibold tabular-nums ${
                          t.type === "income" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}
                        <Money value={t.amount} />
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
