"use client"

import { useState } from "react"
import { Tags, Plus, Trash2, Lock, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PageHeader } from "../page-header"
import { EmptyState, LoadingState } from "../empty-state"
import { useCategories, useCreateCategory, useDeleteCategory } from "@/lib/api"
import { toast } from "sonner"

const COLOR_PRESETS = [
  "#2fc7f7", "#1e9bd8", "#a855f7", "#f59e0b", "#ef4444",
  "#10b981", "#6366f1", "#ec4899", "#14b8a6", "#64748b",
]

function CategoryList({
  type,
  title,
  icon: Icon,
}: {
  type: "income" | "expense"
  title: string
  icon: typeof TrendingUp
}) {
  const { data, isLoading } = useCategories()
  const create = useCreateCategory()
  const del = useDeleteCategory()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [color, setColor] = useState(COLOR_PRESETS[0])

  const items = (type === "income" ? data?.income : data?.expense) ?? []
  const isIncome = type === "income"

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error("Введите название")
    create.mutate(
      { type, name: name.trim(), color: isIncome ? undefined : color },
      {
        onSuccess: () => {
          toast.success("Статья добавлена")
          setName("")
          setColor(COLOR_PRESETS[0])
          setOpen(false)
        },
        onError: (err) => toast.error(`Ошибка: ${(err as Error).message}`),
      },
    )
  }

  function handleDelete(id: string, name: string) {
    del.mutate(
      { id, type },
      {
        onSuccess: () => toast.success(`Статья «${name}» удалена`),
        onError: (err) => toast.error(`Ошибка: ${(err as Error).message}`),
      },
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${isIncome ? "text-emerald-600" : "text-red-600"}`} />
          {title}
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {isIncome ? "Новая статья дохода" : "Новая статья расхода"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Название</Label>
                <Input
                  id="cat-name"
                  placeholder="Например: Консультация"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              {!isIncome && (
                <div className="space-y-1.5">
                  <Label>Цвет на графике</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          color === c ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ background: c }}
                        aria-label={`Цвет ${c}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  Добавить
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState icon={Tags} title="Статей нет" />
        ) : (
          <div className="space-y-1.5">
            {items.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                {isIncome ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                ) : (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: c.color ?? "#94a3b8" }}
                  />
                )}
                <span className="flex-1 font-medium">{c.name}</span>
                {c.isDefault && (
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <Lock className="h-3 w-3" />
                    предустановленная
                  </Badge>
                )}
                {!c.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => handleDelete(c.id, c.name)}
                    disabled={del.isPending}
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function CategoriesView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Статьи доходов и расходов"
        description="Предустановленные статьи нельзя удалить. Добавляйте свои."
        icon={<Tags className="h-5 w-5" />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryList type="income" title="Статьи доходов" icon={TrendingUp} />
        <CategoryList type="expense" title="Статьи расходов" icon={TrendingDown} />
      </div>
    </div>
  )
}
