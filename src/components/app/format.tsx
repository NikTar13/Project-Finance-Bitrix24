"use client"

// Форматтеры для отображения (клиентские). Суммы приходят с бэкенда в рублях.

import { formatRubles } from "@/lib/money"

export function Money({
  value,
  className,
  withSymbol = true,
}: {
  value: number
  className?: string
  withSymbol?: boolean
}) {
  return <span className={className}>{formatRubles(value, withSymbol)}</span>
}

export function Percent({
  value,
  className,
}: {
  value: number | null
  className?: string
}) {
  if (value === null) return <span className={className}>—</span>
  const sign = value > 0 ? "+" : ""
  return (
    <span className={className}>
      {sign}
      {value.toFixed(1)}%
    </span>
  )
}

export function DateText({
  value,
  className,
}: {
  value: string | Date
  className?: string
}) {
  const d = typeof value === "string" ? new Date(value) : value
  return (
    <span className={className}>
      {d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}
    </span>
  )
}

export function DateTimeText({
  value,
  className,
}: {
  value: string | Date
  className?: string
}) {
  const d = typeof value === "string" ? new Date(value) : value
  return (
    <span className={className}>
      {d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}
      {" "}
      {d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
    </span>
  )
}

/** Цвет прибыли/рентабельности: +зелёный, −красный, 0 серый. */
export function profitColor(value: number): string {
  if (value > 0) return "text-emerald-600"
  if (value < 0) return "text-red-600"
  return "text-muted-foreground"
}
