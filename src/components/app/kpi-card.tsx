"use client"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

type Tone = "primary" | "emerald" | "red" | "amber" | "violet" | "slate"

const toneMap: Record<Tone, { icon: string; ring: string }> = {
  primary: { icon: "bg-primary/10 text-primary", ring: "before:bg-primary" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", ring: "before:bg-emerald-500" },
  red: { icon: "bg-red-50 text-red-600", ring: "before:bg-red-500" },
  amber: { icon: "bg-amber-50 text-amber-600", ring: "before:bg-amber-500" },
  violet: { icon: "bg-violet-50 text-violet-600", ring: "before:bg-violet-500" },
  slate: { icon: "bg-slate-100 text-slate-600", ring: "before:bg-slate-400" },
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
  className,
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  tone?: Tone
  hint?: React.ReactNode
  className?: string
}) {
  const t = toneMap[tone]
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5 gap-0 shadow-sm hover:shadow-md transition-shadow",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1",
        t.ring,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", t.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}
