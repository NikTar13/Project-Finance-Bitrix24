// ============================================================================
//  Seed: синхронизация данных из Bitrix24 (mock REST) + предустановленные
//  статьи расходов/доходов + демо-финансы по проектам.
//  Запуск: bun prisma/seed.ts
// ============================================================================

import { db } from "../src/lib/db"
import { bitrixUsersGet, bitrixProjectsGet } from "../src/lib/bitrix24"
import {
  ROLES,
  PROJECT_STATUSES,
  PROJECT_ROLES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "../src/lib/constants"

async function main() {
  console.log("🔄 Очистка БД...")
  await db.auditLog.deleteMany()
  await db.expense.deleteMany()
  await db.income.deleteMany()
  await db.projectUser.deleteMany()
  await db.incomeCategory.deleteMany()
  await db.expenseCategory.deleteMany()
  await db.project.deleteMany()
  await db.user.deleteMany()

  // 1. Пользователи из Bitrix24 -------------------------------------------
  console.log("👥 Синхронизация пользователей из Bitrix24...")
  const bitrixUsers = await bitrixUsersGet()
  const users = await Promise.all(
    bitrixUsers.map((bu, idx) =>
      db.user.create({
        data: {
          bitrixUserId: bu.ID,
          email: bu.EMAIL,
          name: `${bu.NAME} ${bu.LAST_NAME}`,
          position: bu.WORK_POSITION,
          avatarUrl: bu.PERSONAL_PHOTO,
          // первый пользователь — администратор (имитация установщика приложения)
          role:
            idx === 0
              ? ROLES.ADMIN
              : idx === 3
                ? ROLES.FINANCIER
                : idx === 4
                  ? ROLES.MANAGER
                  : ROLES.EMPLOYEE,
          isActive: bu.ACTIVE,
        },
      }),
    ),
  )

  // 2. Проекты из Bitrix24 ------------------------------------------------
  console.log("📁 Синхронизация проектов из Bitrix24...")
  const bitrixProjects = await bitrixProjectsGet()
  const projects = await Promise.all(
    bitrixProjects.map((bp) =>
      db.project.create({
        data: {
          bitrixProjectId: bp.ID,
          name: bp.NAME,
          description: bp.DESCRIPTION,
          status: bp.CLOSED === "Y" ? PROJECT_STATUSES.CLOSED : PROJECT_STATUSES.ACTIVE,
          startedAt: bp.DATE_START ? new Date(bp.DATE_START) : null,
          closedAt: bp.DATE_END ? new Date(bp.DATE_END) : null,
        },
      }),
    ),
  )

  // 3. Предустановленные статьи ------------------------------------------
  console.log("🏷️  Создание предустановленных статей...")
  const expenseCategories = await Promise.all(
    DEFAULT_EXPENSE_CATEGORIES.map((c) =>
      db.expenseCategory.create({
        data: {
          name: c.name,
          color: c.color,
          isDefault: true,
          createdById: users[0].id,
        },
      }),
    ),
  )
  const incomeCategories = await Promise.all(
    DEFAULT_INCOME_CATEGORIES.map((name) =>
      db.incomeCategory.create({
        data: { name, isDefault: true, createdById: users[0].id },
      }),
    ),
  )

  // 4. Назначение сотрудников на проекты ---------------------------------
  console.log("🔗 Назначение сотрудников на проекты...")
  const assign = (projectIdx: number, userIdx: number, role: string) =>
    db.projectUser.create({
      data: {
        projectId: projects[projectIdx].id,
        userId: users[userIdx].id,
        projectRole: role,
        assignedById: users[0].id,
      },
    })

  // Проект 0 (CRM Альфа-Логистик): Иванов(менеджер), Петров, Сидоров, Волкова(QA)
  await assign(0, 0, PROJECT_ROLES.PROJECT_MANAGER)
  await assign(0, 1, PROJECT_ROLES.DEVELOPER)
  await assign(0, 2, PROJECT_ROLES.DEVELOPER)
  await assign(0, 5, PROJECT_ROLES.QA)

  // Проект 1 (Мобильное приложение): Смирнов(менеджер), Петров, Морозов(дизайнер)
  await assign(1, 4, PROJECT_ROLES.PROJECT_MANAGER)
  await assign(1, 1, PROJECT_ROLES.DEVELOPER)
  await assign(1, 6, PROJECT_ROLES.DESIGNER)
  await assign(1, 5, PROJECT_ROLES.QA)

  // Проект 2 (Интеграция 1С): Иванов(менеджер), Петров, Новикова(аналитик)
  await assign(2, 0, PROJECT_ROLES.PROJECT_MANAGER)
  await assign(2, 1, PROJECT_ROLES.DEVELOPER)
  await assign(2, 7, PROJECT_ROLES.ANALYST)

  // Проект 3 (Веб-портал, закрыт): Смирнов, Сидоров, Морозов
  await assign(3, 4, PROJECT_ROLES.PROJECT_MANAGER)
  await assign(3, 2, PROJECT_ROLES.DEVELOPER)
  await assign(3, 6, PROJECT_ROLES.DESIGNER)

  // Проект 4 (Data Platform): Иванов, Петров, Новикова
  await assign(4, 0, PROJECT_ROLES.PROJECT_MANAGER)
  await assign(4, 1, PROJECT_ROLES.DEVELOPER)
  await assign(4, 7, PROJECT_ROLES.ANALYST)

  // Проект 5 (Поддержка CRM): Сидоров
  await assign(5, 2, PROJECT_ROLES.DEVELOPER)

  // 5. Демо-финансы ------------------------------------------------------
  console.log("💰 Наполнение финансовыми операциями...")
  const K = (rub: number) => Math.round(rub * 100) // рубли → копейки
  const adminId = users[0].id
  const financierId = users[3].id

  type Tx = {
    type: "income" | "expense"
    projectIdx: number
    catIdx: number
    amountRub: number
    daysAgo: number
    comment?: string
    createdByIdx?: number
  }

  // Кошелёк операций. Индексы категорий: доходы [0..3], расходы [0..4]
  const transactions: Tx[] = [
    // Проект 0: CRM Альфа-Логистик — доход 1 250 000, расход ~720 000
    { type: "income", projectIdx: 0, catIdx: 1, amountRub: 400000, daysAgo: 90, comment: "Предоплата по договору", createdByIdx: 3 },
    { type: "income", projectIdx: 0, catIdx: 0, amountRub: 450000, daysAgo: 45, comment: "Оплата этапа 1: настройка CRM", createdByIdx: 3 },
    { type: "income", projectIdx: 0, catIdx: 2, amountRub: 400000, daysAgo: 10, comment: "Финальный платёж", createdByIdx: 3 },
    { type: "expense", projectIdx: 0, catIdx: 0, amountRub: 300000, daysAgo: 80, comment: "Субподряд: интеграция телефонии", createdByIdx: 3 },
    { type: "expense", projectIdx: 0, catIdx: 1, amountRub: 220000, daysAgo: 50, comment: "З/п внутренних разработчиков", createdByIdx: 3 },
    { type: "expense", projectIdx: 0, catIdx: 2, amountRub: 45000, daysAgo: 30, comment: "LLM API для авто-ответов", createdByIdx: 3 },
    { type: "expense", projectIdx: 0, catIdx: 3, amountRub: 15000, daysAgo: 20, comment: "Аренда VPS", createdByIdx: 3 },

    // Проект 1: Мобильное приложение — доход 1 800 000, расход ~1 060 000
    { type: "income", projectIdx: 1, catIdx: 1, amountRub: 600000, daysAgo: 120, comment: "Предоплата", createdByIdx: 3 },
    { type: "income", projectIdx: 1, catIdx: 0, amountRub: 600000, daysAgo: 60, comment: "Оплата этапа MVP", createdByIdx: 3 },
    { type: "income", projectIdx: 1, catIdx: 2, amountRub: 600000, daysAgo: 5, comment: "Финальный платёж", createdByIdx: 3 },
    { type: "expense", projectIdx: 1, catIdx: 0, amountRub: 450000, daysAgo: 110, comment: "Внешняя команда: iOS/Android", createdByIdx: 3 },
    { type: "expense", projectIdx: 1, catIdx: 1, amountRub: 320000, daysAgo: 55, comment: "Внутренние разработчики", createdByIdx: 3 },
    { type: "expense", projectIdx: 1, catIdx: 2, amountRub: 70000, daysAgo: 25, comment: "AI-генерация иконок/UI", createdByIdx: 3 },
    { type: "expense", projectIdx: 1, catIdx: 3, amountRub: 25000, daysAgo: 15, comment: "CI/CD серверы", createdByIdx: 3 },

    // Проект 2: Интеграция 1С — доход 350 000, расход ~180 000
    { type: "income", projectIdx: 2, catIdx: 1, amountRub: 150000, daysAgo: 40, comment: "Предоплата", createdByIdx: 3 },
    { type: "income", projectIdx: 2, catIdx: 0, amountRub: 200000, daysAgo: 8, comment: "Оплата этапа обмена документами", createdByIdx: 3 },
    { type: "expense", projectIdx: 2, catIdx: 1, amountRub: 120000, daysAgo: 30, comment: "Внутренние разработчики", createdByIdx: 3 },
    { type: "expense", projectIdx: 2, catIdx: 2, amountRub: 20000, daysAgo: 12, comment: "AI-маппинг справочников", createdByIdx: 3 },
    { type: "expense", projectIdx: 2, catIdx: 3, amountRub: 8000, daysAgo: 6, comment: "Тестовый стенд", createdByIdx: 3 },

    // Проект 3: Веб-портал (закрыт) — доход 950 000, расход ~700 000
    { type: "income", projectIdx: 3, catIdx: 1, amountRub: 300000, daysAgo: 200, comment: "Предоплата", createdByIdx: 3 },
    { type: "income", projectIdx: 3, catIdx: 0, amountRub: 350000, daysAgo: 150, comment: "Этап редизайна", createdByIdx: 3 },
    { type: "income", projectIdx: 3, catIdx: 2, amountRub: 300000, daysAgo: 100, comment: "Финальный платёж", createdByIdx: 3 },
    { type: "expense", projectIdx: 3, catIdx: 0, amountRub: 250000, daysAgo: 190, comment: "Внешние разработчики", createdByIdx: 3 },
    { type: "expense", projectIdx: 3, catIdx: 1, amountRub: 280000, daysAgo: 140, comment: "Внутренняя команда", createdByIdx: 3 },
    { type: "expense", projectIdx: 3, catIdx: 3, amountRub: 40000, daysAgo: 120, comment: "Хостинг", createdByIdx: 3 },
    { type: "expense", projectIdx: 3, catIdx: 4, amountRub: 130000, daysAgo: 95, comment: "Дивиденды по итогам проекта", createdByIdx: 3 },

    // Проект 4: Data Platform — доход 280 000, расход ~150 000
    { type: "income", projectIdx: 4, catIdx: 1, amountRub: 180000, daysAgo: 25, comment: "Предоплата", createdByIdx: 3 },
    { type: "income", projectIdx: 4, catIdx: 0, amountRub: 100000, daysAgo: 3, comment: "Этап: проект хранилища", createdByIdx: 3 },
    { type: "expense", projectIdx: 4, catIdx: 1, amountRub: 90000, daysAgo: 20, comment: "Внутренние разработчики", createdByIdx: 3 },
    { type: "expense", projectIdx: 4, catIdx: 2, amountRub: 35000, daysAgo: 10, comment: "AI-анализ данных", createdByIdx: 3 },
    { type: "expense", projectIdx: 4, catIdx: 3, amountRub: 25000, daysAgo: 5, comment: "Облачное хранилище", createdByIdx: 3 },

    // Проект 5: Поддержка CRM — доход 120 000, расход ~70 000
    { type: "income", projectIdx: 5, catIdx: 0, amountRub: 60000, daysAgo: 35, comment: "Абонентская плата за месяц", createdByIdx: 3 },
    { type: "income", projectIdx: 5, catIdx: 0, amountRub: 60000, daysAgo: 5, comment: "Абонентская плата за месяц", createdByIdx: 3 },
    { type: "expense", projectIdx: 5, catIdx: 1, amountRub: 50000, daysAgo: 30, comment: "Внутренний разработчик (доля времени)", createdByIdx: 3 },
    { type: "expense", projectIdx: 5, catIdx: 3, amountRub: 20000, daysAgo: 7, comment: "Сервер поддержки", createdByIdx: 3 },
  ]

  const now = new Date()
  for (const tx of transactions) {
    const date = new Date(now.getTime() - tx.daysAgo * 24 * 60 * 60 * 1000)
    const createdById = users[tx.createdByIdx ?? 3].id
    if (tx.type === "income") {
      const cat = incomeCategories[tx.catIdx]
      await db.income.create({
        data: {
          projectId: projects[tx.projectIdx].id,
          amount: K(tx.amountRub),
          date,
          categoryId: cat.id,
          comment: tx.comment,
          createdById,
        },
      })
    } else {
      const cat = expenseCategories[tx.catIdx]
      await db.expense.create({
        data: {
          projectId: projects[tx.projectIdx].id,
          amount: K(tx.amountRub),
          date,
          categoryId: cat.id,
          comment: tx.comment,
          createdById,
        },
      })
    }
  }

  // 6. Начальная запись аудита ------------------------------------------
  await db.auditLog.create({
    data: {
      userId: adminId,
      action: "CREATE",
      entityType: "System",
      entityName: "Инициализация приложения",
      details: JSON.stringify({
        users: users.length,
        projects: projects.length,
        expenseCategories: expenseCategories.length,
        incomeCategories: incomeCategories.length,
        transactions: transactions.length,
      }),
    },
  })

  console.log("✅ Seed завершён:")
  console.log(`   Пользователей: ${users.length}`)
  console.log(`   Проектов: ${projects.length}`)
  console.log(`   Статей расходов: ${expenseCategories.length}`)
  console.log(`   Статей доходов: ${incomeCategories.length}`)
  console.log(`   Финансовых операций: ${transactions.length}`)
  console.log(`   Администратор: ${users[0].name} (${users[0].email})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
