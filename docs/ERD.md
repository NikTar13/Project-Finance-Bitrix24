# Сущности и связи (ERD)

Текстовая ER-диаграмма. 8 моделей. Все суммы хранятся в **копейках** (`Int`) для
финансовой точности — в API/UI конвертируются в рубли.

```
┌──────────────────────┐       ┌──────────────────────────┐
│        User          │       │         Project          │
├──────────────────────┤       ├──────────────────────────┤
│ id          PK       │       │ id              PK       │
│ bitrixUserId UK      │       │ bitrixProjectId UK       │
│ email       UK       │       │ name                     │
│ name                 │       │ description              │
│ position             │       │ status (ACTIVE/ON_HOLD/  │
│ avatarUrl            │       │        CLOSED)           │
│ role (ADMIN/         │       │ startedAt                │
│   FINANCIER/MANAGER/ │       │ closedAt                 │
│   EMPLOYEE)          │       └─────────────┬────────────┘
│ isActive             │                     │
└──────┬───────────────┘                     │
       │ 1                                   │ 1
       │                                     │
       │ N                                   │ N
       │ ┌───────────────────────────┐       │
       ├─┤      ProjectUser          ├───────┤
       │ ├───────────────────────────┤       │
       │ │ id            PK          │       │
       │ │ projectId     FK ─────────┼───────┘
       │ │ userId        FK ─────────┤
       │ │ projectRole               │   UQ(projectId, userId)
       │ │ assignedAt                │
       │ │ assignedById   FK ─ User  │
       │ └───────────────────────────┘
       │
       │ 1
       │
       │ N            ┌───────────────────────────┐
       ├─────────────►│      IncomeCategory       │
       │              ├───────────────────────────┤
       │              │ id            PK          │
       │              │ name          UK          │
       │              │ isDefault                 │
       │              │ createdById   FK ─ User   │
       │              └─────────────┬─────────────┘
       │                            │ 1
       │                            │
       │                            │ N
       │              ┌─────────────┴─────────────┐
       │              │         Income            │
       │              ├───────────────────────────┤
       ├─────────────►│ createdById   FK ─ User   │
       │              │ id            PK          │
       │              │ projectId     FK ─ Project│
       │              │ amount        Int (коп.)  │
       │              │ date                      │
       │              │ categoryId    FK ─ IncCat │
       │              │ comment                   │
       │              └───────────────────────────┘
       │
       │ 1            ┌───────────────────────────┐
       ├─────────────►│     ExpenseCategory       │
       │              ├───────────────────────────┤
       │              │ id            PK          │
       │              │ name          UK          │
       │              │ isDefault                 │
       │              │ color         (hex)       │
       │              │ createdById   FK ─ User   │
       │              └─────────────┬─────────────┘
       │                            │ 1
       │                            │ N
       │              ┌─────────────┴─────────────┐
       │              │         Expense           │
       │              ├───────────────────────────┤
       ├─────────────►│ createdById   FK ─ User   │
       │              │ id            PK          │
       │              │ projectId     FK ─ Project│
       │              │ amount        Int (коп.)  │
       │              │ date                      │
       │              │ categoryId    FK ─ ExpCat │
       │              │ comment                   │
       │              └───────────────────────────┘
       │
       │ 1            ┌───────────────────────────┐
       └─────────────►│        AuditLog           │
                      ├───────────────────────────┤
                      │ id            PK          │
                      │ userId        FK ─ User   │
                      │ action (CREATE/UPDATE/    │
                      │         DELETE)           │
                      │ entityType                │
                      │ entityId                  │
                      │ entityName                │
                      │ details      JSON         │
                      │ createdAt                 │
                      └───────────────────────────┘
```

## Финансовые формулы

| Показатель | Формула |
|---|---|
| Прибыль | `Доход − Расход` |
| Рентабельность | `Прибыль / Расход × 100%` |

Рентабельность считается **по расходам** (ROI на вложенный рубль). При `Расход = 0`
возвращается `null` (отображается «—»), чтобы избежать деления на ноль.

> Альтернативная формула — маржинальность `Прибыль / Доход × 100%`. Выбранный
> вариант зафиксирован в `src/lib/money.ts` и применяется единообразно во всём
> приложении.

## Хранение сумм

Суммы в БД — целые копейки (`Int`), а не `Decimal`/`float`. Это исключает ошибки
округления (так делают реальные финтех-системы). Преобразования:

- запись: `rublesToKopecks(rubles)` — `Math.round(rubles * 100)`
- чтение: `kopecksToRubles(kopecks)` — `kopecks / 100`
