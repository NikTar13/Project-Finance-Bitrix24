"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  PROJECT_STATUS_LABELS,
  ROLE_LABELS,
  PROJECT_ROLE_LABELS,
  type ProjectStatus,
  type Role,
  type ProjectRole,
} from "@/lib/constants"

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const map: Record<ProjectStatus, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ON_HOLD: "bg-amber-50 text-amber-700 border-amber-200",
    CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", map[status], className)}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const map: Record<Role, string> = {
    ADMIN: "bg-primary/10 text-primary border-primary/20",
    FINANCIER: "bg-violet-50 text-violet-700 border-violet-200",
    MANAGER: "bg-sky-50 text-sky-700 border-sky-200",
    EMPLOYEE: "bg-slate-100 text-slate-600 border-slate-200",
  }
  return (
    <Badge variant="outline" className={cn("font-medium", map[role], className)}>
      {ROLE_LABELS[role]}
    </Badge>
  )
}

export function ProjectRoleBadge({ role }: { role: ProjectRole }) {
  return <Badge variant="secondary" className="font-normal">{PROJECT_ROLE_LABELS[role]}</Badge>
}
