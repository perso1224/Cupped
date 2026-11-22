import { describe, expect, it, vi } from 'vitest';

// cupSave telefon modüllerini (depolama, bildirim) içe aktarır; burada yalnızca saf yardımcılar denenir
vi.mock('./storage', () => ({}));
vi.mock('./reminders', () => ({ refreshReminder: () => {} }));

const { parseNum, cupInput } = await import('./cupSave');

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
