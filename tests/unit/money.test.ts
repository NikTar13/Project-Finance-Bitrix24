// ============================================================================
//  Unit-тесты финансовой логики (src/lib/money.ts).
//  Чистые функции, без БД и сети — быстрые и детерминированные.
// ============================================================================

import { test, expect, describe } from "bun:test"
import {
  rublesToKopecks,
  kopecksToRubles,
  formatRubles,
  formatKopecks,
  profitability,
  profit,
} from "../../src/lib/money"

describe("Конвертация копейки ↔ рубли", () => {
  test("рубли → копейки: целые суммы", () => {
    expect(rublesToKopecks(1000)).toBe(100000)
    expect(rublesToKopecks(1)).toBe(100)
    expect(rublesToKopecks(0)).toBe(0)
  })

  test("рубли → копейки: дробные суммы округляются по матправилам", () => {
    expect(rublesToKopecks(100.25)).toBe(10025)
    expect(rublesToKopecks(100.255)).toBe(10026) // математическое округление
    expect(rublesToKopecks(100.005)).toBe(10001) // 100.01 → 10001
    expect(rublesToKopecks(99.999)).toBe(10000) // округление вверх
  })

  test("копейки → рубли", () => {
    expect(kopecksToRubles(100000)).toBe(1000)
    expect(kopecksToRubles(10025)).toBe(100.25)
    expect(kopecksToRubles(0)).toBe(0)
  })

  test("обратимость: rublesToKopecks(kopecksToRubles(x)) === x для целых копеек", () => {
    for (const kopecks of [0, 1, 100, 99999, 1000000, 999999999]) {
      expect(rublesToKopecks(kopecksToRubles(kopecks))).toBe(kopecks)
    }
  })

  test("отсутствие ошибок float-округления на «проблемных» суммах", () => {
    // Классическая проблема: 0.1 + 0.2 !== 0.3 в float
    // При хранении в копейках этой проблемы нет
    const a = rublesToKopecks(0.1)
    const b = rublesToKopecks(0.2)
    expect(a + b).toBe(30) // ровно 30 копеек
    expect(kopecksToRubles(a + b)).toBe(0.3)
  })
})

describe("Форматирование", () => {
  // Примечание: Intl.NumberFormat("ru-RU") использует неразрывный пробел (U+00A0)
  // в качестве разделителя разрядов. Нормализуем для сравнения.
  const norm = (s: string) => s.replace(/\s/g, " ")

  test("formatRubles: разделитель разрядов и символ ₽", () => {
    expect(norm(formatRubles(1000000))).toBe("1 000 000 ₽")
    expect(norm(formatRubles(1500.5))).toBe("1 500,5 ₽")
    expect(norm(formatRubles(0))).toBe("0 ₽")
  })

  test("formatRubles: без символа", () => {
    expect(norm(formatRubles(1234.5, false))).toBe("1 234,5")
  })

  test("formatKopecks: из копеек напрямую", () => {
    expect(norm(formatKopecks(100000))).toBe("1 000 ₽")
    expect(norm(formatKopecks(0))).toBe("0 ₽")
  })
})

describe("Прибыль", () => {
  test("Прибыль = Доход − Расход", () => {
    expect(profit(100000, 60000)).toBe(40000)
    expect(profit(0, 0)).toBe(0)
    expect(profit(100, 200)).toBe(-100) // убыток
  })
})

describe("Рентабельность (Прибыль / Расход × 100%)", () => {
  test("базовый расчёт", () => {
    // Прибыль 400 000, Расход 600 000 → 66.67%
    expect(profitability(1000000, 600000)).toBeCloseTo(66.67, 1)
  })

  test("нулевой расход → null (деление на ноль недопустимо)", () => {
    expect(profitability(100000, 0)).toBeNull()
    expect(profitability(0, 0)).toBeNull()
  })

  test("отрицательный расход → null (защита от некорректных данных)", () => {
    expect(profitability(100000, -50000)).toBeNull()
  })

  test("убыток даёт отрицательную рентабельность", () => {
    // Доход 100 000, Расход 150 000 → Прибыль −50 000 → −33.33%
    expect(profitability(100000, 150000)).toBeCloseTo(-33.33, 1)
  })

  test("расход равен доходу → 0%", () => {
    expect(profitability(500000, 500000)).toBe(0)
  })

  test("точные значения из README (Data Platform: 280к/150к → 86.67%)", () => {
    expect(profitability(280000, 150000)).toBeCloseTo(86.67, 1)
  })

  test("общий ROI портфеля из README (доход 4 750к, расход 2 513к → 89.02%)", () => {
    // ROI = Прибыль / Расход × 100 = (4 750 000 − 2 513 000) / 2 513 000 × 100
    expect(profitability(4750000, 2513000)).toBeCloseTo(89.02, 1)
  })
})
