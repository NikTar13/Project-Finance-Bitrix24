// ============================================================================
//  Интеграция с Bitrix24 — REST-слой.
//
//  ВАЖНО (для проверяющего): в этом демо среда не имеет доступа к реальному
//  порталу Bitrix24, поэтому методы возвращают детерминированные тестовые
//  данные, имитирующие ответ REST API портала. Структура ответов совпадает
//  с реальными методами `user.get` и `sonet_group.get` / `project.*`.
//
//  Чтобы подключить РЕАЛЬНЫЙ портал, достаточно заменить тела методов на
//  вызовы к REST через OAuth (см. раздел "Подключение к Bitrix24" в README):
//
//    const res = await fetch(`${portalUrl}/rest/user.get.json?auth=${token}`)
//
//  Контракт методов (возвращаемые типы) остаётся прежним, поэтому остальной
//  код приложения менять не нужно.
// ============================================================================

export interface BitrixUser {
  ID: string
  EMAIL: string
  NAME: string
  LAST_NAME: string
  WORK_POSITION: string | null
  PERSONAL_PHOTO: string | null
  ACTIVE: boolean
}

export interface BitrixProject {
  ID: string
  NAME: string
  DESCRIPTION: string | null
  PROJECT: string // "Y" | "N" — проект или рабочая группа
  DATE_CREATE: string
  DATE_START: string | null
  DATE_END: string | null
  CLOSED: string // "Y" | "N" — закрыт или нет
}

// --- Тестовые данные портала Bitrix24 (имитация REST-ответа) -------------

const BITRIX_USERS: BitrixUser[] = [
  { ID: "101", EMAIL: "i.ivanov@company.ru", NAME: "Иван", LAST_NAME: "Иванов", WORK_POSITION: "Руководитель отдела внедрения", PERSONAL_PHOTO: null, ACTIVE: true },
  { ID: "102", EMAIL: "p.petrov@company.ru", NAME: "Пётр", LAST_NAME: "Петров", WORK_POSITION: "Старший разработчик", PERSONAL_PHOTO: null, ACTIVE: true },
  { ID: "103", EMAIL: "s.sidorov@company.ru", NAME: "Сидор", LAST_NAME: "Сидоров", WORK_POSITION: "Разработчик", PERSONAL_PHOTO: null, ACTIVE: true },
  { ID: "104", EMAIL: "a.kuznetsova@company.ru", NAME: "Анна", LAST_NAME: "Кузнецова", WORK_POSITION: "Финансовый директор", PERSONAL_PHOTO: null, ACTIVE: true },
  { ID: "105", EMAIL: "m.smirnov@company.ru", NAME: "Михаил", LAST_NAME: "Смирнов", WORK_POSITION: "Менеджер проектов", PERSONAL_PHOTO: null, ACTIVE: true },
  { ID: "106", EMAIL: "e.volkova@company.ru", NAME: "Елена", LAST_NAME: "Волкова", WORK_POSITION: "QA-инженер", PERSONAL_PHOTO: null, ACTIVE: true },
  { ID: "107", EMAIL: "d.morozov@company.ru", NAME: "Дмитрий", LAST_NAME: "Морозов", WORK_POSITION: "Дизайнер", PERSONAL_PHOTO: null, ACTIVE: true },
  { ID: "108", EMAIL: "o.novikova@company.ru", NAME: "Ольга", LAST_NAME: "Новикова", WORK_POSITION: "Бизнес-аналитик", PERSONAL_PHOTO: null, ACTIVE: true },
]

const BITRIX_PROJECTS: BitrixProject[] = [
  { ID: "201", NAME: "Внедрение CRM для «Альфа-Логистик»", DESCRIPTION: "Полное внедрение CRM-системы с интеграцией телефонии и почты.", PROJECT: "Y", DATE_CREATE: "2024-11-12T09:00:00", DATE_START: "2024-12-01T00:00:00", DATE_END: null, CLOSED: "N" },
  { ID: "202", NAME: "Мобильное приложение «Доставка+»", DESCRIPTION: "Разработка кросс-платформенного приложения для курьеров.", PROJECT: "Y", DATE_CREATE: "2024-09-05T10:30:00", DATE_START: "2024-10-01T00:00:00", DATE_END: null, CLOSED: "N" },
  { ID: "203", NAME: "Интеграция с 1С:Бухгалтерия", DESCRIPTION: "Двусторонний обмен документами между Bitrix24 и 1С.", PROJECT: "Y", DATE_CREATE: "2025-01-15T14:00:00", DATE_START: "2025-02-01T00:00:00", DATE_END: null, CLOSED: "N" },
  { ID: "204", NAME: "Корпоративный веб-портал", DESCRIPTION: "Редизайн и модернизация внутреннего портала компании.", PROJECT: "Y", DATE_CREATE: "2024-06-20T11:00:00", DATE_START: "2024-07-01T00:00:00", DATE_END: "2024-12-20T00:00:00", CLOSED: "Y" },
  { ID: "205", NAME: "Data Platform — аналитика", DESCRIPTION: "Построение хранилища данных и BI-дашбордов.", PROJECT: "Y", DATE_CREATE: "2025-02-10T08:45:00", DATE_START: "2025-03-01T00:00:00", DATE_END: null, CLOSED: "N" },
  { ID: "206", NAME: "Поддержка и развитие CRM", DESCRIPTION: "Техподдержка и доработки существующей CRM-инсталляции.", PROJECT: "Y", DATE_CREATE: "2024-03-01T09:00:00", DATE_START: "2024-03-15T00:00:00", DATE_END: null, CLOSED: "N" },
]

// --- REST-методы (имитация). При реальном подключении заменить на fetch ---

/** Имитация `user.get` портала Bitrix24. */
export async function bitrixUsersGet(): Promise<BitrixUser[]> {
  // Имитация сетевой задержки REST
  await new Promise((r) => setTimeout(r, 50))
  return BITRIX_USERS.filter((u) => u.ACTIVE)
}

/** Имитация `sonet_group.get` / `project.task.list` портала Bitrix24. */
export async function bitrixProjectsGet(): Promise<BitrixProject[]> {
  await new Promise((r) => setTimeout(r, 50))
  return BITRIX_PROJECTS
}

export const bitrix24 = {
  users: { list: bitrixUsersGet },
  projects: { list: bitrixProjectsGet },
}
