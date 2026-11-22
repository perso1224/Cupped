import { beforeEach, describe, expect, it, vi } from 'vitest';

// Telefon modülleri yerine bellek içi sahteleri (web yolu: kayıtlar AsyncStorage'da)
const mem = new Map<string, string>();
vi.mock('react-native', () => ({ Platform: { OS: 'web' }, Appearance: { setColorScheme: () => {}, getColorScheme: () => 'light' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
    getAllKeys: async () => [...mem.keys()],
    multiRemove: async (ks: string[]) => ks.forEach((k) => mem.delete(k)),
  },
}));
vi.mock('expo-file-system', () => ({ Directory: class {}, File: class {}, Paths: {} }));
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: {} }));

const { importBackup, loadEntries, saveEntry, consumeRecoveryNotice, deleteAllData } = await import('./storage');
const { scoreCup } = await import('./scoring');
type CupEntry = import('./types').CupEntry;

const cup = (id: string, iso: string, place: string | null, history: CupEntry[] = []): CupEntry => {
  const input = { method: 'espresso' as const, placeName: place, venueKind: place ? ('independent' as const) : ('home' as const), notes: [], origin: null };
  const r = scoreCup(input, history, iso);
  return { id, createdAt: iso, photoUri: null, ...input, score: r.total, parts: r.parts, palateTypeId: 'pure_intensity' };
};

beforeEach(async () => {
  // Her test boş telefonla ve boş bellek listesiyle başlar
  await deleteAllData();
  mem.clear();
});

describe('veri katmanı', () => {
  it('ana veri ve yedek bozuksa: kayıt yine yapılır, kullanıcıya bir kez haber verilir', async () => {
    mem.set('cupped.entries.v1', '{bozuk');
    mem.set('cupped.entries.v1.bak', '[{bozuk');
    await saveEntry(cup('a', '2026-11-22T09:00:00.000Z', null));
    expect((await loadEntries()).map((e) => e.id)).toEqual(['a']);
    expect(await consumeRecoveryNotice()).toBe(true);
    expect(await consumeRecoveryNotice()).toBe(false);
    // bozuk ham veri silinmedi, ayrıca saklandı
    expect([...mem.keys()].some((k) => k.includes('corrupt'))).toBe(true);
  });

  it('geçmişe ("dün") eklenen fincan sonrakinin ilk ziyaret puanını alır; toplam çift sayılmaz', async () => {
    const today = cup('today', '2026-11-22T09:00:00.000Z', 'Kafe X');
    await saveEntry(today);
    const yesterday = cup('yest', '2026-11-21T09:00:00.000Z', 'Kafe X');
    await saveEntry(yesterday);
    const all = await loadEntries();
    expect(all.find((e) => e.id === 'yest')!.parts.discovery).toBe(25);
    expect(all.find((e) => e.id === 'today')!.parts.discovery).toBe(0);
  });

  it('yedekten geri yükleme sonrası yeniden puanlanır', async () => {
    await saveEntry(cup('local', '2026-11-20T09:00:00.000Z', 'Kafe X'));
    const backup = { app: 'Cupped', format: 1, entries: [cup('old', '2026-11-10T09:00:00.000Z', 'Kafe X')] };
    expect(await importBackup(JSON.stringify(backup))).toBe(1);
    const all = await loadEntries();
    expect(all.find((e) => e.id === 'old')!.parts.discovery).toBe(25);
    expect(all.find((e) => e.id === 'local')!.parts.discovery).toBe(0);
  });

  it('bilinmeyen (daha yeni sürüm) alanlar kayıtta korunur', async () => {
    mem.set('cupped.entries.v1', JSON.stringify([{ ...cup('x', '2026-11-01T09:00:00.000Z', null), futureField: 'kalsın' }]));
    await saveEntry(cup('y', '2026-11-02T09:00:00.000Z', null));
    const raw = JSON.parse(mem.get('cupped.entries.v1')!);
    expect(raw.find((e: { id: string }) => e.id === 'x').futureField).toBe('kalsın');
  });
});
