import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import type { CupEntry } from './types';

// Tüm veriler sadece telefonda tutulur (sunucu yok).
const ENTRIES_KEY = 'cupped.entries.v1';
const COUNTERS_KEY = 'cupped.counters.v1';

export type Counters = {
  cardsGenerated: number;
  shares: number;
};

export async function loadEntries(): Promise<CupEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    const list: CupEntry[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // en yeni önce
  } catch {
    return [];
  }
}

export async function saveEntry(entry: CupEntry): Promise<void> {
  const list = await loadEntries();
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify([entry, ...list.filter((e) => e.id !== entry.id)]));
}

export async function getEntry(id: string): Promise<CupEntry | undefined> {
  return (await loadEntries()).find((e) => e.id === id);
}

export async function loadCounters(): Promise<Counters> {
  try {
    const raw = await AsyncStorage.getItem(COUNTERS_KEY);
    return { cardsGenerated: 0, shares: 0, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { cardsGenerated: 0, shares: 0 };
  }
}

export async function bumpCounter(name: keyof Counters): Promise<void> {
  const c = await loadCounters();
  c[name] += 1;
  await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(c));
}

/** Kameradan/galeriden gelen geçici fotoğrafı kalıcı klasöre kopyalar. */
export async function persistPhoto(tempUri: string, id: string): Promise<string> {
  const dir = new Directory(Paths.document, 'cups');
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${id}.jpg`);
  await new File(tempUri).copy(dest);
  return dest.uri;
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Daha önce girilen mekan adları (en sık kullanılan önce). */
export function knownPlaces(entries: CupEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (e.placeName && (e.venueKind === 'chain' || e.venueKind === 'independent')) {
      counts.set(e.placeName, (counts.get(e.placeName) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
