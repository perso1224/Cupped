import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { parseEntries } from './entries';
import { appLabel, normalizeMetrics, type Metrics, type ShareSource } from './metrics';
import { normalizePlace } from './scoring';
import type { Profile } from './onboarding';
import type { CupEntry } from './types';

// Tüm veriler sadece telefonda tutulur (sunucu yok).
const ENTRIES_KEY = 'cupped.entries.v1';
const ENTRIES_BACKUP_KEY = 'cupped.entries.v1.bak';
const COUNTERS_KEY = 'cupped.counters.v1';
const PROFILE_KEY = 'cupped.profile.v1';
const METRICS_KEY = 'cupped.metrics.v1';

export type Counters = {
  cardsGenerated: number;
  shares: number;
};

// Yazmalar sırayla yapılır (aynı anda iki kayıt birbirini ezmesin).
let writeChain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.catch(() => {});
  return run;
}

/** Yazmadan önce okuma: hata olursa FIRLATIR, böylece bozuk/okunamayan verinin üzerine yazılmaz. */
async function readEntriesStrict(): Promise<CupEntry[]> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  try {
    return parseEntries(raw);
  } catch (err) {
    // Ana veri bozuksa: bozuk hali ayrı bir yere kaydet, yedekten devam et. Yedek de bozuksa yazma iptal.
    const backup = parseEntries(await AsyncStorage.getItem(ENTRIES_BACKUP_KEY)); // bozuksa fırlatır
    if (raw) await AsyncStorage.setItem(`${ENTRIES_KEY}.corrupt.${Date.now()}`, raw);
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(backup));
    void err;
    return backup;
  }
}

async function writeEntries(list: CupEntry[]): Promise<void> {
  const current = await AsyncStorage.getItem(ENTRIES_KEY);
  if (current) await AsyncStorage.setItem(ENTRIES_BACKUP_KEY, current); // son sağlam hali yedekle
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(list));
}

/** Ekranlar için okuma: hata olursa yedekten dener, o da olmazsa boş liste (ama hiçbir şey silinmez). */
export async function loadEntries(): Promise<CupEntry[]> {
  try {
    return await readEntriesStrict();
  } catch {
    try {
      return parseEntries(await AsyncStorage.getItem(ENTRIES_BACKUP_KEY));
    } catch {
      return [];
    }
  }
}

export function saveEntry(entry: CupEntry): Promise<void> {
  return enqueue(async () => {
    const list = await readEntriesStrict();
    await writeEntries([entry, ...list.filter((e) => e.id !== entry.id)]);
  });
}

export function deleteEntry(id: string): Promise<void> {
  return enqueue(async () => {
    const list = await readEntriesStrict();
    const target = list.find((e) => e.id === id);
    await writeEntries(list.filter((e) => e.id !== id));
    if (target?.photoUri) deletePhoto(target.photoUri);
  });
}

export async function getEntry(id: string): Promise<CupEntry | undefined> {
  return (await loadEntries()).find((e) => e.id === id);
}

export async function loadCounters(): Promise<Counters> {
  const zero: Counters = { cardsGenerated: 0, shares: 0 };
  try {
    const raw = await AsyncStorage.getItem(COUNTERS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return { cardsGenerated: Number(data.cardsGenerated) || 0, shares: Number(data.shares) || 0 };
  } catch {
    return zero;
  }
}

export function bumpCounter(name: keyof Counters): Promise<void> {
  return enqueue(async () => {
    const c = await loadCounters();
    c[name] += 1;
    await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(c));
  });
}

/**
 * Kameradan/galeriden gelen geçici fotoğrafı kalıcı klasöre kopyalar.
 * Göreli yol döner ("cups/<id>.jpg"); ekranda photoUrl() ile tam adrese çevrilir.
 */
export async function persistPhoto(tempUri: string, id: string): Promise<string> {
  const dir = new Directory(Paths.document, 'cups');
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${id}.jpg`);
  if (dest.exists) dest.delete();
  const source = await shrinkPhoto(tempUri);
  await new File(source).copy(dest);
  return `cups/${id}.jpg`;
}

/** Kamera fotoğrafları ~8MP; kart için 1080 piksel genişlik yeterli (fincan başına ~3MB yerine ~250KB). */
const MAX_PHOTO_WIDTH = 1080;
async function shrinkPhoto(uri: string): Promise<string> {
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const ctx = ImageManipulator.manipulate(uri);
    if (original.width > MAX_PHOTO_WIDTH) ctx.resize({ width: MAX_PHOTO_WIDTH });
    const img = await ctx.renderAsync();
    const saved = await img.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    return uri; // küçültülemezse orijinali kullan
  }
}

/** Saklanan (göreli) fotoğraf yolunu bu kurulumdaki tam adrese çevirir. */
export function photoUrl(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (stored.includes('://')) return stored; // cups dışında kalmış eski adres
  try {
    return new File(Paths.document, stored).uri;
  } catch {
    return null; // dosya sistemi kullanılamıyorsa fotoğrafsız göster, ekran çökmesin
  }
}

function deletePhoto(stored: string) {
  try {
    if (stored.includes('://')) return;
    const f = new File(Paths.document, stored);
    if (f.exists) f.delete();
  } catch {
    // fotoğraf silinemese de kayıt silinmiş olur
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Daha önce girilen mekan adları (en sık kullanılan önce). */
export function knownPlaces(entries: CupEntry[]): string[] {
  // Aynı mekanın farklı yazımları ("starbucks" / "Starbucks ") tek çip olur; en son kullanılan yazım gösterilir.
  const groups = new Map<string, { name: string; count: number }>();
  for (const e of entries) {
    if (e.placeName && (e.venueKind === 'chain' || e.venueKind === 'independent')) {
      const key = normalizePlace(e.placeName);
      const g = groups.get(key);
      if (g) g.count++;
      else groups.set(key, { name: e.placeName.trim(), count: 1 }); // entries en yeni önce geldiği için ilk görülen = en son yazım
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count).map((g) => g.name);
}

// Profil bellekte de tutulur; değişince dinleyen ekranlar (useProfile) güncellenir.
let profileCache: Profile | null | undefined;
const profileListeners = new Set<(p: Profile | null) => void>();

export function subscribeProfile(fn: (p: Profile | null) => void): () => void {
  profileListeners.add(fn);
  return () => profileListeners.delete(fn);
}

function setProfileCache(p: Profile | null) {
  profileCache = p;
  profileListeners.forEach((fn) => fn(p));
}

export function cachedProfile(): Profile | null | undefined {
  return profileCache;
}

export async function loadProfile(): Promise<Profile | null> {
  if (profileCache !== undefined) return profileCache;
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    profileCache = raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    profileCache = null;
  }
  return profileCache;
}

export async function saveProfile(p: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  setProfileCache(p);
}

/** Tanıtımı tekrar göstermek için (test amaçlı). Fincanlar silinmez. */
export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
  setProfileCache(null);
}

// ---------- Ölçüm (H2-H6), sadece bu telefonda ----------

export async function loadMetrics(): Promise<Metrics> {
  try {
    return normalizeMetrics(JSON.parse((await AsyncStorage.getItem(METRICS_KEY)) ?? 'null'));
  } catch {
    return normalizeMetrics(null);
  }
}

export function updateMetrics(fn: (m: Metrics) => void): Promise<Metrics> {
  return enqueue(async () => {
    const m = await loadMetrics();
    fn(m);
    await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(m));
    return m;
  });
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** H4: uygulamanın açıldığı günü kaydeder. */
export function recordActiveDay(): Promise<Metrics> {
  const k = todayKey();
  return updateMetrics((m) => {
    if (!m.activeDays.includes(k)) m.activeDays.push(k);
  });
}

/** H2: paylaşım düğmesine basıldı / paylaşım tamamlandı (hangi uygulamaya). */
export function recordShare(source: ShareSource, result: 'tap' | 'completed', activityType?: string | null, cupId?: string) {
  return updateMetrics((m) => {
    if (result === 'tap') {
      m.shareTaps[source] += 1;
      return;
    }
    m.sharesCompleted[source] += 1;
    const app = appLabel(activityType);
    m.sharesByApp[app] = (m.sharesByApp[app] ?? 0) + 1;
    if (cupId && !m.sharedCupIds.includes(cupId)) m.sharedCupIds.push(cupId);
    if (!m.firstShareAt) m.firstShareAt = new Date().toISOString();
  });
}

/** Tüm verileri tek bir JSON dosyasına yazar (yedek / kurucuya göndermek için). Dosya adresini döner. */
export async function exportAllData(): Promise<string> {
  const [entries, profile, metrics, counters] = await Promise.all([loadEntries(), loadProfile(), loadMetrics(), loadCounters()]);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const file = new File(Paths.cache, `cupped-yedek-${stamp}.json`);
  file.create({ overwrite: true });
  await file.write(
    JSON.stringify({ app: 'Cupped', format: 1, exportedAt: d.toISOString(), profile, entries, metrics, counters }, null, 2),
  );
  return file.uri;
}
