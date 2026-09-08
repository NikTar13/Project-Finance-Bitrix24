# REST API

Базовый путь: `/api`. Все суммы в ответах — в **рублях** (`number`).
Даты — ISO 8601.

## Аутентификация

Текущий пользователь определяется по cookie `pf_b24_user` (имитация Bitrix24 SSO).

### `GET /api/auth/me`
Текущий пользователь. Если cookie нет — возвращается первый администратор.

**Ответ 200:**
```json
{ "user": { "id": "...", "bitrixUserId": "101", "email": "i.ivanov@company.ru",
  "name": "Иван Иванов", "position": "...", "avatarUrl": null,
  "role": "ADMIN", "isActive": true } }
```

### `POST /api/auth/me`
Сменить текущего пользователя (демо многопользовательности).
**Тело:** `{ "userId": "..." }`

---

## Dashboard

### `GET /api/dashboard`
Сводка для главной: KPI, расходы по статьям, прибыль по месяцам, последние операции.

**Ответ 200:**
```json
{
  "projectsCount": 6,
  "activeProjectsCount": 5,
  "totalIncome": 4800000,
  "totalExpense": 2513000,
  "totalProfit": 2287000,
  "totalProfitability": 90.97,
  "expensesByCategory": [
    { "name": "Внутренние программисты", "color": "#1e9bd8", "amount": 1080000 }
  ],
  "profitByMonth": [
    { "month": "апр.", "income": 0, "expense": 0, "profit": 0 }
  ],
  "recentTransactions": [
    { "id": "...", "type": "income", "date": "...", "amount": 50000,
      "categoryName": "Оплата этапа", "projectName": "...", "projectId": "..." }
  ]
}
```

---

## Проекты

### `GET /api/projects`
Список проектов с агрегатами.
```json
{ "projects": [ { "id": "...", "name": "...", "status": "ACTIVE",
  "income": 280000, "expense": 150000, "profit": 130000,
  "profitability": 86.67, "employeesCount": 3 } ] }
```

### `POST /api/projects/sync`
Синхронизация проектов из Bitrix24 (REST `sonet_group.get`). Upsert по `bitrixProjectId`.
```json
{ "created": 0, "updated": 6, "total": 6 }
```

### `GET /api/projects/:id`
Карточка проекта: агрегаты + список сотрудников.
```json
{ "project": { "...как в списке...", "employees": [
  { "id": "...", "userId": "...", "projectRole": "DEVELOPER",
    "assignedAt": "...", "user": { "...UserDTO..." } } ] } }
```

### `PATCH /api/projects/:id`
Обновить `status` (`ACTIVE`/`ON_HOLD`/`CLOSED`) и/или `description`.
**Тело:** `{ "status": "ON_HOLD", "description": "..." }`

### `POST /api/projects/:id/employees`
Назначить сотрудника. **Тело:** `{ "userId": "...", "projectRole": "DEVELOPER" }`
`projectRole`: `PROJECT_MANAGER` | `DEVELOPER` | `QA` | `DESIGNER` | `ANALYST`

### `DELETE /api/projects/:id/employees/:assignId`
Снять сотрудника с проекта.

---

## Доходы

### `GET /api/income?projectId=`
Список доходов (опционально по проекту).
```json
{ "incomes": [ { "id": "...", "projectId": "...", "projectName": "...",
  "amount": 50000, "date": "...", "categoryId": "...", "categoryName": "Оплата этапа",
  "comment": null, "createdByName": "Иван Иванов", "createdAt": "..." } ] }
```

### `POST /api/income`
Добавить доход.
**Тело:** `{ "projectId": "...", "amount": 50000, "date": "2026-09-08",
  "categoryId": "...", "comment": "..." }`
**Валидация:** `amount > 0`, `amount ≤ 1 000 000 000`, корректная дата.

### `PUT /api/income/:id`
Изменить доход (любые поля опциональны).

### `DELETE /api/income/:id`
Удалить доход.

---

## Расходы

### `GET /api/expenses?projectId=`
Аналогично доходам, дополнительно содержит `color` статьи.

### `POST /api/expenses`
**Тело:** `{ "projectId": "...", "amount": 25000, "date": "...",
  "categoryId": "...", "comment": "..." }`

### `PUT /api/expenses/:id` · `DELETE /api/expenses/:id`

---

## Статьи

### `GET /api/categories`
```json
{ "income": [ { "id": "...", "name": "Оплата этапа", "isDefault": true } ],
  "expense": [ { "id": "...", "name": "Внешние программисты", "isDefault": true,
    "color": "#2fc7f7" } ] }
```

### `POST /api/categories`
Создать статью. **Тело:** `{ "type": "expense", "name": "Маркетинг", "color": "#10b981" }`
`type`: `income` | `expense`. `color` — только для расхода (для графика).

### `DELETE /api/categories/:id?type=income|expense`
Удалить статью. Нельзя удалить предустановленную (`isDefault`) или используемую в операциях.

---

## Сотрудники

### `GET /api/employees`
Сотрудники из Bitrix24 (локальное зеркало) + счётчик проектов.
```json
{ "employees": [ { "...UserDTO...", "projectsCount": 3 } ] }
```

---

## Журнал аудита

### `GET /api/audit?limit=100`
```json
{ "logs": [ { "id": "...", "userName": "Иван Иванов", "action": "CREATE",
  "actionLabel": "Создание", "entityType": "Income", "entityId": "...",
  "entityName": "Внедрение CRM — Оплата этапа", "details": "{...}", "createdAt": "..." } ] }
```

---

## Коды ошибок

| Код | Случай |
|---|---|
| 400 | Невалидное тело / сумма ≤ 0 / некорректная дата |
| 404 | Проект/статья/запись не найдены |
| 409 | Дубликат (статья уже есть, сотрудник уже назначен) |

Все ошибки возвращают `{ "error": "сообщение" }`.
