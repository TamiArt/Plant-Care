/**
 * Проверяет, отмечено ли опрыскивание растения за выбранный день.
 *
 * История хранится как локальные календарные даты YYYY-MM-DD, поэтому для
 * статуса достаточно сравнить последнюю запись с текущей UTC-датой — тем же
 * форматом, который используется при добавлении ухода.
 */
export function isMistedToday(
  history: string[],
  now: number | Date = Date.now(),
): boolean {
  const date = now instanceof Date ? now : new Date(now);
  const today = date.toISOString().split("T")[0];

  return history.includes(today);
}
