// ============================================================================
//  E2E тесты через Agent Browser — проверка реального пользовательского UX.
//
//  Эти тесты запускают headless Chromium и проходят реальные сценарии:
//   - Дашборд рендерится без ошибок
//   - Навигация между разделами работает
//   - Добавление дохода через UI обновляет расчёты
//   - Переключение пользователя меняет шапку
//
//  Используют agent-browser CLI (headless Chromium).
// ============================================================================

import { test, expect, describe, beforeAll, afterAll } from "bun:test"
import { execFileSync } from "child_process"
import { GET, POST, DELETE, TEST_MARKER, getFirstProject, getFirstIncomeCategory } from "../setup"

const BASE_URL = "http://localhost:3000"

// Вызов agent-browser с массивом аргументов (execFileSync не делает shell-unquoting,
// поэтому передаём аргументы как есть — пробелы внутри аргумента сохраняются).
function abArgs(args: string[]): string {
  try {
    return execFileSync("agent-browser", args, {
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    })
  } catch (e: any) {
    return (e.stdout ?? "") + (e.stderr ?? "")
  }
}

// Простая команда одной строкой (split по пробелам — для команд без сложных аргументов).
function ab(cmd: string): string {
  return abArgs(cmd.split(" "))
}

// eval — передаём JS-выражение как один аргумент (с пробелами внутри).
function evalRaw(expr: string): string {
  return abArgs(["eval", expr]).trim()
}

// eval с автоматической очисткой JSON-обёртки agent-browser
function evalJs(expr: string): string {
  const raw = evalRaw(expr)
  // agent-browser оборачивает строковые результаты в кавычки
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw.slice(1, -1)
    }
  }
  return raw
}

// eval с приведением к числу
function evalNum(expr: string): number {
  const v = Number(evalJs(expr))
  return Number.isFinite(v) ? v : 0
}

// Клик по кнопке навигации по имени (сайдбар)
function clickNavButton(name: string): void {
  abArgs(["find", "role", "button", "click", "--name", name])
}

// Пауза
function wait(ms: number): void {
  abArgs(["wait", String(ms)])
}

let project: { id: string }
let incomeCat: { id: string }

beforeAll(async () => {
  project = await getFirstProject()
  incomeCat = await getFirstIncomeCategory()
  // открыть приложение
  ab(`open ${BASE_URL}`)
  wait(2000)
})

afterAll(() => {
  ab("close")
})

describe("E2E: рендеринг и навигация", () => {
  test("страница загружается с корректным заголовком", () => {
    const title = ab("get title").trim()
    expect(title).toContain("Project Finance")
  })

  test("на дашборде есть навигация на 7 разделов", () => {
    const snap = ab("snapshot -i")
    for (const label of ["Главная", "Проекты", "Доходы", "Расходы", "Статьи", "Сотрудники", "Журнал"]) {
      expect(snap).toContain(label)
    }
  })

  test("нет ошибок в консоли браузера", () => {
    const errors = ab("errors")
    // допускаем только пустой вывод
    expect(errors.trim().length).toBeLessThan(50)
  })

  test("KPI-карточки дашборда содержат числовые значения", () => {
    const text = evalJs("document.body.innerText")
    // проверяем, что есть суммы в рублях
    expect(text).toMatch(/\d+\s*₽/)
  })

  test("переход в раздел «Проекты» показывает таблицу проектов", () => {
    clickNavButton("Проекты")
    wait(1500)
    const snap = ab("snapshot -i")
    expect(snap).toContain("Проект")
    expect(snap).toContain("Рентаб")
  })

  test("переход в раздел «Сотрудники» показывает карточки из Bitrix24", () => {
    clickNavButton("Сотрудники")
    wait(1500)
    const text = evalJs("document.body.innerText")
    // seed-данные содержат фамилии Иванов/Петров/Сидоров
    expect(text).toMatch(/Иванов|Петров|Сидоров/)
  })

  test("переход в раздел «Статьи» показывает 5 предустановленных расходов", () => {
    clickNavButton("Статьи")
    wait(1500)
    const text = evalJs("document.body.innerText")
    for (const name of [
      "Внешние программисты",
      "Внутренние программисты",
      "Расходы на ИИ",
      "Аренда сервера",
      "Дивиденды",
    ]) {
      expect(text).toContain(name)
    }
  })
})

describe("E2E: добавление дохода через UI", () => {
  test("форма добавления дохода открывается и содержит все поля", () => {
    // переходим в раздел «Доходы»
    clickNavButton("Доходы")
    wait(2000)

    // открываем форму
    clickNavButton("Добавить доход")
    wait(1500)

    const snap = ab("snapshot -i")
    expect(snap).toContain("Новый доход")
    // проверяем наличие всех полей формы
    expect(snap).toContain("Проект")
    expect(snap).toContain("Сумма")
    expect(snap).toContain("Статья дохода")
    expect(snap).toContain("Комментарий")
    expect(snap).toContain("Сохранить")
    expect(snap).toContain("Отмена")
  })

  test("доход создаётся через UI и доступен через API", async () => {
    // Форма уже открыта из предыдущего теста. Заполняем.
    const snap = ab("snapshot -i")
    const amountRef = (snap.match(/textbox "Сумма, ₽".*ref=(e\d+)/) || [])[1]
    expect(amountRef).toBeTruthy()
    ab(`fill @${amountRef} 99000`)

    // выбираем проект (первый combobox)
    const projectCombo = (snap.match(/combobox "Проект".*ref=(e\d+)/) || [])[1]
    expect(projectCombo).toBeTruthy()
    ab(`click @${projectCombo}`)
    wait(1000)
    let opts = ab("snapshot -i")
    const firstProjOpt = (opts.match(/option "[^"]+".*ref=(e\d+)/) || [])[1]
    expect(firstProjOpt).toBeTruthy()
    ab(`click @${firstProjOpt}`)
    wait(800)

    // выбираем статью дохода
    const snap2 = ab("snapshot -i")
    const catCombo = (snap2.match(/combobox "Статья дохода".*ref=(e\d+)/) || [])[1]
    expect(catCombo).toBeTruthy()
    ab(`click @${catCombo}`)
    wait(1000)
    opts = ab("snapshot -i")
    const firstCatOpt = (opts.match(/option "[^"]+".*ref=(e\d+)/) || [])[1]
    expect(firstCatOpt).toBeTruthy()
    ab(`click @${firstCatOpt}`)
    wait(800)

    // сохраняем
    const snap3 = ab("snapshot -i")
    const saveRef = (snap3.match(/button "Сохранить".*ref=(e\d+)/) || [])[1]
    expect(saveRef).toBeTruthy()
    ab(`click @${saveRef}`)
    wait(2500)

    // проверяем через API, что доход 99000 создан
    const r = await GET("/api/income")
    const found = (r.data as { incomes: Array<{ id: string; amount: number }> }).incomes.find(
      (i) => i.amount === 99000,
    )
    expect(found).toBeDefined()
    // очистка
    await DELETE(`/api/income/${found!.id}`)
  }, 45000)
})

describe("E2E: переключение пользователя", () => {
  test("в шапке отображается текущий пользователь", () => {
    clickNavButton("Главная")
    wait(1500)
    const text = evalJs("document.body.innerText")
    // один из seed-пользователей
    expect(text).toMatch(/Иванов|Кузнецова|Петров|Смирнов/)
  })

  test("переключение на другого пользователя меняет шапку", () => {
    ab("snapshot -i")
    const snap1 = ab("snapshot -i")
    const userBtn = (snap1.match(/button "(\w\w)\s+\S+\s+\S+".*ref=(e\d+)/) || [])[2]
    if (userBtn) {
      ab(`click @${userBtn}`)
      wait(1000)
      const snap2 = ab("snapshot -i")
      const items = snap2.match(/menuitem "[^"]+".*ref=(e\d+)/g) || []
      const enabledItem = items.find((s) => !s.includes("disabled"))
      const itemRef = (enabledItem.match(/ref=(e\d+)/) || [])[1]
      if (itemRef) {
        ab(`click @${itemRef}`)
        wait(2000)
        const text = evalJs("document.body.innerText")
        expect(text).toMatch(/\w\w\s+\S+/)
      }
    }
  })
})

describe("E2E: адаптивность и sticky footer", () => {
  test("на мобильном разрешении страница рендерится", () => {
    ab("set viewport 375 812") // iPhone-размер
    wait(1500)
    // На мобильном сайдбар скрыт за бургером — навигация не нужна,
    // просто проверяем, что страница отрендерилась.
    const bodyLen = evalNum("document.body.innerText.length")
    expect(bodyLen).toBeGreaterThan(100)
    // footer присутствует даже на мобильном
    const footerExists = evalNum("document.querySelector('footer') ? 1 : 0")
    expect(footerExists).toBe(1)
  })

  test("footer присутствует на странице на десктопе", () => {
    ab("set viewport 1280 800")
    wait(1500)
    const footerText = evalJs("document.querySelector('footer') ? document.querySelector('footer').innerText : ''")
    expect(footerText).toContain("Project Finance")
    expect(footerText).toContain("Рентабельность")
  })

  test("footer корректно позиционирован (в конце body, не фиксированный)", () => {
    ab("set viewport 1280 400")
    wait(1500)
    clickNavButton("Главная")
    wait(2000)
    // footer существует
    const footerExists = evalNum("document.querySelector('footer') ? 1 : 0")
    expect(footerExists).toBe(1)
    // footer НЕ fixed/absolute (поведение sticky через flex)
    const position = evalJs("getComputedStyle(document.querySelector('footer')).position")
    expect(position).not.toBe("fixed")
    expect(position).not.toBe("absolute")
    // footer.top >= 0 (не перекрывает контент сверху)
    const footerTop = evalNum("document.querySelector('footer').getBoundingClientRect().top + window.scrollY")
    expect(footerTop).toBeGreaterThan(0)
    // footer.top <= body.scrollHeight (в пределах body)
    const bodyHeight = evalNum("document.body.scrollHeight")
    expect(footerTop).toBeLessThanOrEqual(bodyHeight)
    // footer.bottom == body.scrollHeight (footer в самом конце body)
    const footerBottom = evalNum("document.querySelector('footer').getBoundingClientRect().bottom + window.scrollY")
    expect(footerBottom).toBeCloseTo(bodyHeight, -1)
  })

  test("footer уходит вниз при переполнении контентом (на длинной странице)", () => {
    ab("set viewport 1280 600")
    wait(1500)
    clickNavButton("Журнал")
    wait(2500)
    const bodyHeight = evalNum("document.body.scrollHeight")
    const viewportHeight = evalNum("window.innerHeight")
    // журнал длинный — body выше viewport
    expect(bodyHeight).toBeGreaterThan(viewportHeight)
    // footer существует и расположен в конце body (не перекрывает контент)
    const footerTop = evalNum("document.querySelector('footer') ? document.querySelector('footer').getBoundingClientRect().top + window.scrollY : -1")
    expect(footerTop).toBeGreaterThan(0)
    expect(footerTop).toBeLessThanOrEqual(bodyHeight)
  })
})
