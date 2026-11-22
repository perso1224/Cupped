import { describe, expect, it } from 'vitest';
import { DISCOVER, discoverFeed, discoverIndex } from './discover';

describe('keşfet', () => {
  it('her gün sıradaki madde, sonra başa döner', () => {
    const d = new Date(2026, 10, 22, 9);
    const next = new Date(2026, 10, 23, 23);
    expect(discoverIndex(next)).toBe((discoverIndex(d) + 1) % DISCOVER.length);
    expect(discoverIndex(new Date(2026, 10, 22, 23, 59))).toBe(discoverIndex(d));
  });
  it('akış bugünden geriye gider, tekrarsız', () => {
    const f = discoverFeed(new Date(2026, 10, 22), 7);
    expect(f[0]).toBe(DISCOVER[discoverIndex(new Date(2026, 10, 22))]);
    expect(new Set(f.map((x) => x.id)).size).toBe(7);
  });
  it('kimlikler tekrarsız, metinler dolu', () => {
    expect(new Set(DISCOVER.map((x) => x.id)).size).toBe(DISCOVER.length);
    for (const x of DISCOVER) expect(x.title.length && x.body.length > 40).toBeTruthy();
  });
});
