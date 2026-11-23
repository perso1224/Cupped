import { describe, expect, it, vi } from 'vitest';

// cupSave telefon modüllerini (depolama, bildirim) içe aktarır; burada yalnızca saf yardımcılar denenir
vi.mock('./storage', () => ({}));
vi.mock('./reminders', () => ({ refreshReminder: () => {} }));

const { parseNum, cupInput, movedToDay } = await import('./cupSave');

describe('sayı girişi', () => {
  it('Türkçe ondalık ve binlik ayırıcıyı anlar', () => {
    expect(parseNum('18,5')).toBe(18.5);
    expect(parseNum('18.5')).toBe(18.5);
    expect(parseNum('1.000')).toBe(1000);
    expect(parseNum('1,000')).toBe(1000);
    expect(parseNum('250')).toBe(250);
    expect(parseNum(' 15 ')).toBe(15);
  });
  it('boş ya da geçersizde null', () => {
    expect(parseNum('')).toBeNull();
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('0')).toBeNull();
    expect(parseNum('-3')).toBeNull();
  });
});

describe('form → skor girdisi', () => {
  it('yazılan zincir adı zincir sayılır, ev/ofis yer adı taşımaz', () => {
    expect(cupInput({ method: 'espresso', where: { kind: 'place', name: 'Starbucks Moda' }, notes: [], origin: ' ' })).toEqual({
      method: 'espresso',
      placeName: 'Starbucks Moda',
      venueKind: 'chain',
      notes: [],
      origin: null,
    });
    expect(cupInput({ method: 'filter', where: { kind: 'home' }, notes: ['fruity'], origin: 'Etiyopya' }).placeName).toBeNull();
  });
});

describe('düzenlemede gün değiştirme', () => {
  it('saati korur, geleceğe taşmaz', () => {
    const now = new Date(2026, 10, 22, 10, 0);
    const orig = new Date(2026, 10, 20, 8, 10).toISOString();
    const y = new Date(movedToDay(orig, 'yesterday', now));
    expect([y.getDate(), y.getHours(), y.getMinutes()]).toEqual([21, 8, 10]);
    const late = new Date(2026, 10, 20, 23, 0).toISOString();
    expect(movedToDay(late, 'now', now)).toBe(now.toISOString());
  });
});
