import { dayKey } from './progress';

export const REMINDER_HOUR = 20;
export const REMINDER_MINUTE = 30;

/** Bir sonraki hatırlatmanın zamanı ve metni (saf, testli). */
export function nextReminder(
  cupDays: Set<string>,
  streak: number,
  now: Date,
  hour: number = REMINDER_HOUR,
  minute: number = REMINDER_MINUTE,
) {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  // Bugün fincan eklendiyse ya da saat geçtiyse: yarın
  if (cupDays.has(dayKey(now)) || now.getTime() >= at.getTime()) at.setDate(at.getDate() + 1);
  const body =
    streak > 0
      ? `Serin ${streak} gün. Bugünkü fincanını ekle, ${streak + 1} olsun ☕`
      : 'Bugün hangi kahveyi içtin? 5 saniyede ekle ☕';
  return { at, title: 'Cupped', body };
}
