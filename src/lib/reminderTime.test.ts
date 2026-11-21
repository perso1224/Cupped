import { describe, expect, it } from 'vitest';
import { nextReminder } from './reminderTime';

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
