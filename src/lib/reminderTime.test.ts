import { describe, expect, it } from 'vitest';
import { nextReminder, reminderPlan, REMINDER_FOLLOWUPS } from './reminderTime';
import { dayKey } from './progress';

describe('hatırlatma zamanı', () => {
  const morning = new Date(2026, 10, 21, 9, 0);
  it('bugün fincan yoksa bugün 20:30', () => {
    expect(nextReminder(new Set(), 0, morning).at).toEqual(new Date(2026, 10, 21, 20, 30));
  });
  it('bugün fincan varsa yarın 20:30', () => {
    expect(nextReminder(new Set(['2026-11-21']), 3, morning).at).toEqual(new Date(2026, 10, 22, 20, 30));
  });
  it('saat geçtiyse yarın (ay sonu dahil)', () => {
    expect(nextReminder(new Set(), 0, new Date(2026, 10, 30, 22, 0)).at).toEqual(new Date(2026, 11, 1, 20, 30));
  });
  it('özel saat', () => {
    expect(nextReminder(new Set(), 0, morning, 13, 0).at).toEqual(new Date(2026, 10, 21, 13, 0));
  });
  it('seri metni', () => {
    expect(nextReminder(new Set(), 4, morning).body).toContain('Serin 4 gün');
    expect(nextReminder(new Set(), 0, morning).body).toContain('Bugün hangi kahveyi');
  });
});

describe('reminderPlan', () => {
  it('ilk hatırlatmadan sonra her gün bir tane daha kurar', () => {
    const plan = reminderPlan(new Set(['2026-11-21']), 3, new Date(2026, 10, 21, 9, 0));
    expect(plan).toHaveLength(REMINDER_FOLLOWUPS + 1);
    expect(plan[0].at).toEqual(new Date(2026, 10, 22, 20, 30));
    expect(plan[1].at).toEqual(new Date(2026, 10, 23, 20, 30));
    expect(plan[0].body).toContain('3 gün');
    expect(plan[1].body).not.toContain('Serin');
  });
});

describe('seri metni bozulmuş seriyi vaat etmez', () => {
  it('bugün fincan yokken saat geçtiyse yarınki hatırlatma genel metindir', () => {
    const now = new Date(2026, 10, 22, 21, 0);
    const days = new Set([dayKey(new Date(2026, 10, 19)), dayKey(new Date(2026, 10, 20)), dayKey(new Date(2026, 10, 21))]);
    const r = nextReminder(days, 3, now);
    expect(r.at.getDate()).toBe(23);
    expect(r.body).not.toContain('Serin');
  });
  it('bugün fincan eklendiyse yarınki hatırlatma seriyi söyler', () => {
    const now = new Date(2026, 10, 22, 10, 0);
    const days = new Set([dayKey(new Date(2026, 10, 21)), dayKey(now)]);
    expect(nextReminder(days, 2, now).body).toContain('Serin 2 gün');
  });
});
