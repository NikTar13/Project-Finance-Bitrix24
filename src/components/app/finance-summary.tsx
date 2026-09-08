"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Percent as PercentIcon } from "lucide-react"
import { Money, Percent, profitColor } from "./format"

/** Сводка финансов проекта/дашборда: Доход / Расход / Прибыль / Рентабельность. */
export function FinanceSummary({
  income,
  expense,
  profit,
  profitability,
  compact = false,
}: {
  income: number
  expense: number
  profit: number
  profitability: number | null
  compact?: boolean
}) {
  const items = [
    {
      label: "Доход",
      value: <Money value={income} className="text-emerald-600" />,
      icon: TrendingUp,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Расход",
      value: <Money value={expense} className="text-red-600" />,
      icon: TrendingDown,
      tone: "text-red-600 bg-red-50",
    },
    {
      label: "Прибыль",
      value: <Money value={profit} className={profitColor(profit)} />,
      icon: Wallet,
      tone:
        profit > 0
          ? "text-emerald-600 bg-emerald-50"
          : profit < 0
            ? "text-red-600 bg-red-50"
            : "text-muted-foreground bg-muted",
    },
    {
      label: "Рентабельность",
      value: <Percent value={profitability} className={profitColor(profit)} />,
      icon: PercentIcon,
      tone: "text-primary bg-primary/10",
    },
  ]
  return (
    <div className={compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 lg:grid-cols-4 gap-4"}>
      {items.map((it) => (
        <Card key={it.label} className="p-4 gap-0 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`flex h-6 w-6 items-center justify-center rounded ${it.tone}`}>
              <it.icon className="h-3.5 w-3.5" />
            </span>
            {it.label}
          </div>
          <div className={`mt-2 font-semibold tabular-nums ${compact ? "text-lg" : "text-xl"}`}>
            {it.value}
          </div>
        </Card>
      ))}
    </div>
  )
}
