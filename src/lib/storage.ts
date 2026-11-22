import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { parseEntries, parseEntriesDetailed } from './entries';
import { deleteAllRaw, keepCorruptRaw, readRaw, writeRaw } from './entryStore';
import { rescoreAfter } from './rescore';
import { appLabel, normalizeMetrics, type Metrics, type ShareSource } from './metrics';
import { normalizeSettings, type Settings } from './settings';
import { placeNameKey } from './scoring';
import { normalizeProfile, type Profile } from './onboarding';
import type { CupEntry } from './types';
import { clearThemePref } from '../theme';

// Tüm veriler sadece telefonda tutulur (sunucu yok).
const COUNTERS_KEY = 'cupped.counters.v1';
const PROFILE_KEY = 'cupped.profile.v1';
const METRICS_KEY = 'cupped.metrics.v1';
const SETTINGS_KEY = 'cupped.settings.v1';
const RECOVERED_KEY = 'cupped.recovered';

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

/**
 * Yazmadan önce okuma: hata olursa FIRLATIR, böylece bozuk/okunamayan verinin üzerine yazılmaz.
 * Sadece yazma kuyruğunun (enqueue) içinden çağrılır; onarım da burada yapılır.
 */
async function readEntriesStrict(): Promise<CupEntry[]> {
  const raw = await readRaw('main');
  try {
    const { entries, dropped } = parseEntriesDetailed(raw);
    // Bazı kayıtlar okunamadıysa (ör. gelecekteki bir sürümün yeni alanı), üzerine yazmadan önce ham hali sakla.
    if (dropped > 0 && raw) await keepCorrupt(raw);
    return entries;
  } catch (err) {
    // Ana veri bozuksa: bozuk hali ayrı bir yere kaydet, yedekten devam et.
    // Bozuk ham veri HER ZAMAN önce ayrı anahtara saklanır (kaybolmaz).
    void err;
    if (raw) await keepCorrupt(raw);
    const backupRaw = await readRaw('backup');
    let backup: CupEntry[] = [];
    try {
      backup = backupRaw ? parseEntries(backupRaw) : [];
    } catch {
      // Yedek de bozuk: onu da sakla, boş listeyle devam et (yoksa hiç fincan eklenemez). Kullanıcıya bir kez söylenir.
      if (backupRaw) await keepCorrupt(backupRaw);
      await AsyncStorage.setItem(RECOVERED_KEY, String(Date.now()));
    }
    await writeRaw('main', JSON.stringify(backup));
    return backup;
  }
}

/** Okunamayan ham veriyi ayrı anahtarda saklar; en yeni 3 kopya tutulur (telefon hafızası dolmasın). */
async function keepCorrupt(raw: string) {
  await keepCorruptRaw(raw);
}

/** Veri bozulup boş listeyle devam edildiyse bir kez true döner (ekranda haber vermek için). */
export async function consumeRecoveryNotice(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(RECOVERED_KEY);
    if (!v) return false;
    await AsyncStorage.removeItem(RECOVERED_KEY);
    return true;
  } catch {
    return false;
  }
}

async function writeEntries(list: CupEntry[]): Promise<void> {
  const current = await readRaw('main');
  if (current) await writeRaw('backup', current); // son sağlam hali yedekle
  await writeRaw('main', JSON.stringify(list));
  // Bellekteki liste de güncellenir (en yeni önce), ekranlar haberdar edilir
  setEntriesCache([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

// Fincanlar bellekte de tutulur: her ekran açılışında tüm liste telefondan yeniden okunup çözülmesin.
// Yazmalar yalnızca bu dosyadan yapıldığı için bellekteki liste her zaman günceldir.
let entriesCache: CupEntry[] | null = null;
const entriesListeners = new Set<(list: CupEntry[]) => void>();
function setEntriesCache(list: CupEntry[] | null) {
  entriesCache = list;
  if (list) entriesListeners.forEach((fn) => fn(list));
}
export function cachedEntries(): CupEntry[] | null {
  return entriesCache;
}
export function subscribeEntries(fn: (list: CupEntry[]) => void): () => void {
  entriesListeners.add(fn);
  return () => {
    entriesListeners.delete(fn);
  };
}

/** Ekranlar için okuma: hata olursa yedekten dener, o da olmazsa boş liste (ama hiçbir şey silinmez). */
export async function loadEntries(): Promise<CupEntry[]> {
  if (entriesCache) return entriesCache;
  // Salt okunur: onarım yazmaları yalnızca kuyruktaki yazmalarda yapılır (yarış durumunda yeni kayıt ezilmesin).
  try {
    const list = parseEntries(await readRaw('main'));
    if (!entriesCache) entriesCache = list;
    return entriesCache;
  } catch {
    // Bozuk veri bellekte tutulmaz (bir sonraki yazma onarır)
    try {
      return parseEntries(await readRaw('backup'));
    } catch {
      return [];
    }
  }
}

export function saveEntry(entry: CupEntry): Promise<void> {
  return enqueue(async () => {
    const list = await readEntriesStrict();
    const next = [entry, ...list.filter((e) => e.id !== entry.id)];
    // Geçmişe eklenen fincan ("dün"): sonraki fincanların keşif puanı ve damak tipi buna göre yenilenir
    // (aynı mekana iki fincan birden "ilk ziyaret" puanı almasın).
    const later = list.some((e) => e.createdAt > entry.createdAt);
    await writeEntries(later ? rescoreAfter(next, entry.createdAt) : next);
  });
}

/**
 * Var olan kaydı yerinde günceller (liste sırası korunur).
 * Fotoğraf değiştiyse eskisi silinir.
 */
export function updateEntry(entry: CupEntry): Promise<void> {
  return enqueue(async () => {
    const list = await readEntriesStrict();
    const old = list.find((e) => e.id === entry.id);
    if (!old) throw new Error('entry not found');
    let next = list.map((e) => (e.id === entry.id ? entry : e));
    // Yöntem/mekan/tat notu değiştiyse sonraki fincanların keşif puanı ve damak tipi güncellenir
    const scoringChanged =
      old.method !== entry.method ||
      old.placeName !== entry.placeName ||
      old.venueKind !== entry.venueKind ||
      old.notes.join(',') !== entry.notes.join(',') ||
      old.createdAt !== entry.createdAt;
    // Tarih değiştiyse eski ve yeni tarihin erkeninden sonrası yenilenir
    const from = old.createdAt < entry.createdAt ? old.createdAt : entry.createdAt;
    if (scoringChanged) next = rescoreAfter(next, new Date(Date.parse(from) - 1).toISOString());
    await writeEntries(next);
    if (old.photoUri && old.photoUri !== entry.photoUri) deletePhoto(old.photoUri);
  });
}

export function deleteEntry(id: string): Promise<void> {
  return enqueue(async () => {
    const list = await readEntriesStrict();
    const target = list.find((e) => e.id === id);
    const rest = list.filter((e) => e.id !== id);
    // Silinen fincan bir mekanın/yöntemin ilk kaydıysa, sonraki fincan o keşif puanını alır
    await writeEntries(target ? rescoreAfter(rest, target.createdAt) : rest);
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
export async function persistPhoto(tempUri: string, id: string, opts: { version?: string; width?: number } = {}): Promise<string> {
  const { version } = opts;
  const dir = new Directory(Paths.document, 'cups');
  if (!dir.exists) dir.create({ intermediates: true });
  // Düzenlemede yeni ad: aynı adı kullanmak görüntü önbelleğinde eski fotoğrafı gösterebilir.
  const name = version ? `${id}-${version}.jpg` : `${id}.jpg`;
  const dest = new File(dir, name);
  if (dest.exists) dest.delete();
  const source = await shrinkPhoto(tempUri, opts.width);
  await new File(source).copy(dest);
  if (source !== tempUri) {
    try {
      new File(source).delete(); // küçültülmüş geçici kopya
    } catch {
      // önemli değil
    }
  }
  return `cups/${name}`;
}

/** Kamera fotoğrafları ~8MP; kart için 1080 piksel genişlik yeterli (fincan başına ~3MB yerine ~250KB). */
const MAX_PHOTO_WIDTH = 1080;
async function shrinkPhoto(uri: string, knownWidth?: number): Promise<string> {
  try {
    // Genişlik kameradan/galeriden biliniyorsa görüntü tek kez çözülür (büyük fotoğraflarda bellek sıçraması olmasın)
    let width = knownWidth;
    if (!width) {
      const probe = await ImageManipulator.manipulate(uri).renderAsync();
      width = probe.width;
      probe.release?.();
    }
    const ctx = ImageManipulator.manipulate(uri);
    if (width > MAX_PHOTO_WIDTH) ctx.resize({ width: MAX_PHOTO_WIDTH });
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

/** Kayda bağlanmamış fotoğraf dosyasını siler (ör. düzenleme kaydedilemediyse). */
export function discardPhoto(stored: string) {
  deletePhoto(stored);
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
      const key = placeNameKey(e.placeName);
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
    profileCache = raw ? normalizeProfile(JSON.parse(raw)) : null;
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
export function exportAllData(): Promise<string> {
  return enqueue(async () => {
    // Okunamayan veri varsa boş "yedek" üretmek yerine hata ver (kullanıcı uyarılır)
    const entries = await readEntriesStrict();
    const [profile, metrics, counters, settings] = await Promise.all([loadProfile(), loadMetrics(), loadCounters(), loadSettings()]);
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
    // Eski dışa aktarma dosyaları önbellekte birikmesin (tüm geçmişin düz metin kopyaları)
    try {
      for (const item of Paths.cache.list()) if (item instanceof File && item.name.startsWith('cupped-yedek-')) item.delete();
    } catch {
      // önemli değil
    }
    const file = new File(Paths.cache, `cupped-yedek-${stamp}.json`);
    file.create({ overwrite: true });
    await file.write(
      JSON.stringify({ app: 'Cupped', format: 1, exportedAt: d.toISOString(), profile, settings, entries, metrics, counters }, null, 2),
    );
    return file.uri;
  });
}

// ---------- Ayarlar (bellekte de tutulur; değişince useSettings dinleyicileri güncellenir) ----------

let settingsCache: Settings = normalizeSettings(null);
let settingsLoaded = false;
const settingsListeners = new Set<(s: Settings) => void>();

export function cachedSettings(): Settings {
  return settingsCache;
}

export function subscribeSettings(fn: (s: Settings) => void): () => void {
  settingsListeners.add(fn);
  return () => settingsListeners.delete(fn);
}

let settingsLoading: Promise<Settings> | null = null;

/** Ayarları bir kez yükler; aynı anda gelen çağrılar aynı yüklemeyi bekler (bir değişiklik ezilmesin). */
export function loadSettings(): Promise<Settings> {
  if (settingsLoaded) return Promise.resolve(settingsCache);
  if (!settingsLoading) {
    settingsLoading = (async () => {
      try {
        settingsCache = normalizeSettings(JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? 'null'));
      } catch {
        settingsCache = normalizeSettings(null);
      }
      settingsLoaded = true;
      settingsListeners.forEach((fn) => fn(settingsCache));
      return settingsCache;
    })();
  }
  return settingsLoading;
}

export function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return enqueue(async () => {
    const next = normalizeSettings({ ...(await loadSettings()), ...patch });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); // önce yaz, sonra ekranlara duyur
    settingsCache = next;
    settingsListeners.forEach((fn) => fn(next));
    return next;
  });
}

// ---------- Yedekten geri yükleme ve silme ----------

/**
 * Dışa aktarılmış yedek dosyasını (JSON) okuyup fincanları birleştirir (aynı id'ler tekrar eklenmez).
 * Profil, ölçümler ve fotoğraflar yedekte taşınmaz (yalnızca fincanlar ve ayarlar). Eklenen fincan sayısını döner.
 */
export class InvalidBackupError extends Error {}

export function importBackup(json: string): Promise<number> {
  return enqueue(async () => {
    let data: { app?: unknown; format?: unknown; entries?: unknown; profile?: unknown; settings?: unknown; metrics?: unknown };
    try {
      data = JSON.parse(json);
    } catch {
      throw new InvalidBackupError('json');
    }
    // Sadece Cupped yedekleri (başka uygulamanın JSON'u "0 eklendi" diye başarılı görünmesin)
    if (!data || data.app !== 'Cupped' || !Array.isArray(data.entries) || (typeof data.format === 'number' && data.format > 1)) {
      throw new InvalidBackupError('format');
    }
    if (data.entries.length > 20000) throw new InvalidBackupError('size');
    const incoming = parseEntries(JSON.stringify(data.entries));
    const current = await readEntriesStrict();
    const ids = new Set(current.map((e) => e.id));
    // Yedekteki fotoğraflar bu telefonda yok: fotoğrafsız eklenir
    const added = incoming.filter((e) => !ids.has(e.id)).map((e) => ({ ...e, photoUri: null }));
    const merged = [...added, ...current];
    // Eklenen en eski fincandan sonrası yeniden puanlanır (aynı mekana iki "ilk ziyaret" puanı kalmasın)
    const oldest = added.reduce<string | null>((m, e) => (m === null || e.createdAt < m ? e.createdAt : m), null);
    // rescoreAfter "fromIso"dan SONRAKİLERİ yeniler; en eski eklenen fincanın kendisi de dahil olsun diye 1 ms önce
    const from = oldest ? new Date(Date.parse(oldest) - 1).toISOString() : null;
    await writeEntries(from ? rescoreAfter(merged, from) : merged);
    // Hatırlatma açık/kapalı bilgisi ölçümlerde duruyor: bu telefonda henüz seçilmediyse yedektekini al
    const backupReminder = (data as { metrics?: { reminderEnabled?: unknown } }).metrics?.reminderEnabled;
    if (typeof backupReminder === 'boolean') {
      const m = await loadMetrics();
      if (m.reminderEnabled === null) {
        m.reminderEnabled = backupReminder;
        await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(m));
      }
    }
    // Ayarlar: bu telefonda hâlâ varsayılanlar kullanılıyorsa yedekteki ayarları al (hatırlatma saati, kafein…)
    if (data.settings && JSON.stringify(await loadSettings()) === JSON.stringify(normalizeSettings(null))) {
      const next = normalizeSettings(data.settings);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      settingsCache = next;
      settingsListeners.forEach((fn) => fn(next));
    }
    return added.length;
  });
}

/** Tüm verileri siler (fincanlar, fotoğraflar, profil, ölçümler, ayarlar). Geri alınamaz. */
export function deleteAllData(): Promise<void> {
  return enqueue(async () => {
    // Tüm Cupped anahtarları (yedek ve bozuk-kopya anahtarları dahil)
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('cupped.'));
    await AsyncStorage.multiRemove(keys);
    deleteAllRaw(); // telefondaki fincan dosyaları
    try {
      const dir = new Directory(Paths.document, 'cups');
      if (dir.exists) dir.delete();
    } catch {
      // fotoğraf klasörü silinemese de veriler silinmiş olur
    }
    // Önbellekteki dışa aktarma dosyaları ve geçici fotoğraflar
    try {
      for (const item of Paths.cache.list()) {
        if (item instanceof File && (item.name.startsWith('cupped-yedek-') || /\.(jpe?g|png)$/i.test(item.name))) item.delete();
      }
    } catch {
      // önbellek temizlenemese de veriler silinmiş olur
    }
    clearThemePref(); // tema tercihi de ayardır
    setEntriesCache([]);
    settingsCache = normalizeSettings(null);
    settingsListeners.forEach((fn) => fn(settingsCache));
    setProfileCache(null);
  });
}
