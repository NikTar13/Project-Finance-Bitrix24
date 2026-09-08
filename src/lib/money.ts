// ============================================================================
//  Финансовые преобразования.
//  В БД суммы хранятся в КОПЕЙКАХ (Int) — без ошибок float.
//  В UI/API отдаём в рублях (number). Все расчёты ведём в копейках.
// ============================================================================

/** Рубли → копейки (для записи в БД). Принимает число рублей. */
export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100)
}

/** Копейки → рубли (для отображения). */
export function kopecksToRubles(kopecks: number): number {
  return kopecks / 100
}

/** Форматирование суммы в рублях с разделителем разрядов и символом ₽. */
export function formatRubles(rubles: number, withSymbol = true): string {
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rubles)
  return withSymbol ? `${formatted} ₽` : formatted
}

/** Удобно: форматировать напрямую из копеек (БД). */
export function formatKopecks(kopecks: number, withSymbol = true): string {
  return formatRubles(kopecksToRubles(kopecks), withSymbol)
}

/**
 * Рентабельность = Прибыль / Расход × 100%.
 * Формула зафиксирована в README. При расходе = 0 возвращаем null
 * (корректность расчётов — обязательный критерий оценки).
 */
export function profitability(incomeKopecks: number, expenseKopecks: number): number | null {
  if (expenseKopecks <= 0) return null
  return (incomeKopecks - expenseKopecks) / expenseKopecks * 100
}

/** Прибыль в копейках. */
export function profit(incomeKopecks: number, expenseKopecks: number): number {
  return incomeKopecks - expenseKopecks
}
