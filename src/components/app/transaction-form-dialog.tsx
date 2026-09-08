"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProjects, useCategories, useCreateIncome, useCreateExpense } from "@/lib/api"
import { toast } from "sonner"

export function TransactionFormDialog({
  type,
  defaultProjectId,
  trigger,
  onSaved,
}: {
  type: "income" | "expense"
  defaultProjectId?: string
  trigger?: React.ReactNode
  onSaved?: () => void
}) {
  const [open, setOpen] = useState(false)
  const isIncome = type === "income"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            {isIncome ? "Добавить доход" : "Добавить расход"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {/* Монтируем форму только при открытии → начальное состояние считается один раз */}
        {open && (
          <TransactionForm
            type={type}
            defaultProjectId={defaultProjectId}
            onDone={() => setOpen(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TransactionForm({
  type,
  defaultProjectId,
  onDone,
  onSaved,
}: {
  type: "income" | "expense"
  defaultProjectId?: string
  onDone: () => void
  onSaved?: () => void
}) {
  const isIncome = type === "income"
  const { data: projects } = useProjects()
  const { data: categories } = useCategories()
  const createIncome = useCreateIncome()
  const createExpense = useCreateExpense()

  const [projectId, setProjectId] = useState(defaultProjectId ?? "")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState("")
  const [comment, setComment] = useState("")

  const cats = isIncome ? categories?.income : categories?.expense
  const mutate = isIncome ? createIncome : createExpense

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projectId) return toast.error("Выберите проект")
    const amountNum = Number(amount.replace(",", "."))
    if (!Number.isFinite(amountNum) || amountNum <= 0) return toast.error("Введите корректную сумму")
    if (!categoryId) return toast.error("Выберите статью")

    mutate.mutate(
      {
        projectId,
        amount: amountNum,
        date: new Date(date).toISOString(),
        categoryId,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(isIncome ? "Доход добавлен" : "Расход добавлен")
          onSaved?.()
          onDone()
        },
        onError: (err) => toast.error(`Ошибка: ${(err as Error).message}`),
      },
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isIncome ? "Новый доход" : "Новый расход"}</DialogTitle>
        <DialogDescription>Ручной учёт. Сумма вводится в рублях.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="t-project">Проект</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="t-project">
              <SelectValue placeholder="Выберите проект" />
            </SelectTrigger>
            <SelectContent className="max-h-72 scroll-thin">
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="t-amount">Сумма, ₽</Label>
            <Input
              id="t-amount"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-date">Дата</Label>
            <Input
              id="t-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="t-category">{isIncome ? "Статья дохода" : "Статья расхода"}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="t-category">
              <SelectValue placeholder="Выберите статью" />
            </SelectTrigger>
            <SelectContent className="max-h-72 scroll-thin">
              {cats?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.isDefault && (
                    <span className="text-muted-foreground"> · предустановленная</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="t-comment">Комментарий</Label>
          <Textarea
            id="t-comment"
            rows={2}
            placeholder="Необязательно"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Отмена
          </Button>
          <Button type="submit" disabled={mutate.isPending}>
            {mutate.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
