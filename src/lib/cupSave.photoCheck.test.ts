import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CupEntry } from './types';

const db = vi.hoisted(() => ({ list: [] as CupEntry[], failPhoto: false }));

vi.mock('./storage', () => ({
  loadEntries: async () => [...db.list],
  newId: () => `id${db.list.length + 1}`,
  persistPhoto: async (_uri: string, id: string) => {
    if (db.failPhoto) throw new Error('disk');
    return `cups/${id}.jpg`;
  },
  saveEntry: async (e: CupEntry) => {
    db.list.unshift(e);
  },
  updateEntry: async (e: CupEntry) => {
    db.list = db.list.map((x) => (x.id === e.id ? e : x));
  },
  discardPhoto: () => {},
  loadMetrics: async () => ({ celebratedBadges: [], lastEvolutionAt: null }),
  updateMetrics: async () => {},
}));
vi.mock('./reminders', () => ({ refreshReminder: () => {} }));

const { createCup, editCup } = await import('./cupSave');

const form = (over: Partial<Parameters<typeof createCup>[0]> = {}) => ({
  method: 'filter' as const,
  where: { kind: 'home' as const },
  notes: [],
  origin: '',
  dose: '',
  water: '',
  grind: null,
  note: '',
  rating: null,
  when: 'now' as const,
  photo: null,
  photoWidth: undefined,
  photoCheck: null,
  openedAt: Date.now(),
  ...over,
});

beforeEach(() => {
  db.list = [];
  db.failPhoto = false;
});

describe('kayıtta fotoğraf kontrolü', () => {
  it('fotoğrafsız kayıt "skipped"', async () => {
    await createCup(form());
    expect(db.list[0].photoCheck).toBe('skipped');
  });
  it('fotoğraflı kayıtta kontrol sonucu saklanır (bitmediyse null)', async () => {
    await createCup(form({ photo: 'file:///tmp/a.jpg', photoCheck: 'unsure' }));
    expect(db.list[0].photoCheck).toBe('unsure');
    await createCup(form({ photo: 'file:///tmp/b.jpg', photoCheck: null }));
    expect(db.list[0].photoCheck).toBeNull();
  });
  it('fotoğraf kaydedilemezse fotoğrafsız sayılır', async () => {
    db.failPhoto = true;
    await createCup(form({ photo: 'file:///tmp/a.jpg', photoCheck: 'coffee' }));
    expect(db.list[0].photoUri).toBeNull();
    expect(db.list[0].photoCheck).toBe('skipped');
  });
  it('düzenlemede fotoğraf değişmezse eski sonuç kalır, değişirse yenisi yazılır', async () => {
    await createCup(form({ photo: 'file:///tmp/a.jpg', photoCheck: 'unsure' }));
    const orig = db.list[0];
    await editCup(orig, { ...form({ rating: 5, photoCheck: null }), photoChanged: false, dateChanged: false });
    expect(db.list[0].photoCheck).toBe('unsure');
    await editCup(db.list[0], { ...form({ photo: 'file:///tmp/c.jpg', photoCheck: 'coffee' }), photoChanged: true, dateChanged: false });
    expect(db.list[0].photoCheck).toBe('coffee');
  });
});
