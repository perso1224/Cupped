import type { CupEntry } from './types';

/**
 * Hipotez ölçümü için cihazdaki sayaçlar (sunucu yok).
 * H2: paylaşım oranı · H3: kayıt süresi · H4: geri dönüş günleri · H6: Kulüp ilgisi.
 */
export type ShareSource = 'cup' | 'wrapped' | 'palateCard';

export type Metrics = {
  activeDays: string[]; // uygulamanın açıldığı günler (YYYY-MM-DD, yerel)
  newOpened: number; // fincan ekleme ekranı kaç kez açıldı
  newSaved: number; // kaç kez kayıtla bitti
  shareTaps: Record<ShareSource, number>;
  sharesCompleted: Record<ShareSource, number>;
  sharesByApp: Record<string, number>; // Instagram, WhatsApp, Mesajlar…
  sharedCupIds: string[];
  firstShareAt: string | null;
  clubViews: number;
  clubInterestAt: string | null;
  reminderEnabled: boolean | null; // null = henüz sorulmadı
  lastBackupAt: string | null; // son yedeğin (dışa aktarma) tarihi
  backupNudgeAt: string | null; // ana sayfadaki yedek hatırlatması en son ne zaman ertelendi
  celebratedBadges: string[]; // kutlaması gösterilmiş rozetler (silip yeniden kazanınca tekrar kutlanmasın)
  lastEvolutionAt: string | null; // Damak Evrimi kutlamasının son gösterildiği zaman (sık çıkmasın)
};

export const EMPTY_METRICS: Metrics = {
  activeDays: [],
  newOpened: 0,
  newSaved: 0,
  shareTaps: { cup: 0, wrapped: 0, palateCard: 0 },
  sharesCompleted: { cup: 0, wrapped: 0, palateCard: 0 },
  sharesByApp: {},
  sharedCupIds: [],
  firstShareAt: null,
  clubViews: 0,
  clubInterestAt: null,
  reminderEnabled: null,
  lastBackupAt: null,
  backupNudgeAt: null,
  celebratedBadges: [],
  lastEvolutionAt: null,
};

/** Bozuk/eksik veriyi güvenli varsayılanlarla birleştirir. */
export function normalizeMetrics(raw: unknown): Metrics {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Metrics>;
  const n = (v: unknown) => Number(v) || 0;
  const rec = (v: unknown): Record<ShareSource, number> => {
    const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    return { cup: n(o.cup), wrapped: n(o.wrapped), palateCard: n(o.palateCard) };
  };
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const apps: Record<string, number> = {};
  if (r.sharesByApp && typeof r.sharesByApp === 'object') for (const [k, v] of Object.entries(r.sharesByApp)) apps[k] = n(v);
  return {
    activeDays: [...new Set(strArr(r.activeDays))].sort(),
    newOpened: n(r.newOpened),
    newSaved: n(r.newSaved),
    shareTaps: rec(r.shareTaps),
    sharesCompleted: rec(r.sharesCompleted),
    sharesByApp: apps,
    sharedCupIds: [...new Set(strArr(r.sharedCupIds))],
    firstShareAt: typeof r.firstShareAt === 'string' ? r.firstShareAt : null,
    clubViews: n(r.clubViews),
    clubInterestAt: typeof r.clubInterestAt === 'string' ? r.clubInterestAt : null,
    reminderEnabled: typeof r.reminderEnabled === 'boolean' ? r.reminderEnabled : null,
    lastBackupAt: typeof r.lastBackupAt === 'string' ? r.lastBackupAt : null,
    backupNudgeAt: typeof r.backupNudgeAt === 'string' ? r.backupNudgeAt : null,
    celebratedBadges: [...new Set(strArr(r.celebratedBadges))],
    lastEvolutionAt: typeof r.lastEvolutionAt === 'string' ? r.lastEvolutionAt : null,
  };
}

/** iOS paylaşım hedefini okunur ada çevirir. */
export function appLabel(activityType: string | null | undefined): string {
  const t = (activityType ?? '').toLowerCase();
  if (t.includes('instagram')) return 'Instagram';
  if (t.includes('whatsapp')) return 'WhatsApp';
  if (t.includes('message')) return 'Mesajlar';
  if (t.includes('savetocameraroll') || t.includes('photos')) return 'Fotoğraflara kaydet';
  if (t.includes('airdrop')) return 'AirDrop';
  if (t.includes('telegram')) return 'Telegram';
  if (t.includes('twitter') || t.includes('x.')) return 'X';
  if (!t) return 'Bilinmiyor';
  return 'Diğer';
}

const DAY_MS = 86_400_000;
function dayIndex(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  // UTC gün numarası: saat dilimi/yaz saati farkından etkilenmez (UTC+12/+13'te yuvarlama hatası olmaz)
  return Date.UTC(y, m - 1, d) / DAY_MS;
}
function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type Stats = {
  cups: number;
  cupsShared: number;
  shareRate: number | null; // H2: paylaşılan fincan / fincan (0-1)
  shareTaps: number;
  sharesCompleted: number;
  topApps: [string, number][];
  medianCaptureSec: number | null; // H3
  under10sRate: number | null;
  abandonRate: number | null;
  daysSinceInstall: number | null; // H4
  activeDayCount: number;
  returnedD1: boolean;
  returnedD7: boolean;
  returnedD30: boolean;
  clubInterested: boolean; // H6
  clubViews: number;
};

/** "Test istatistikleri" ekranının sayıları. Saf fonksiyon. */
export function computeStats(m: Metrics, entries: CupEntry[], onboardedAt: string | null, now: Date = new Date()): Stats {
  const ids = new Set(entries.map((e) => e.id));
  const cupsShared = m.sharedCupIds.filter((id) => ids.has(id)).length;
  const times = entries
    .map((e) => e.captureMs)
    .filter((x): x is number => typeof x === 'number' && x > 0)
    .sort((a, b) => a - b);
  const median = times.length ? times[Math.floor((times.length - 1) / 2)] : null;

  const installKey = onboardedAt ? keyOf(new Date(onboardedAt)) : m.activeDays[0] ?? null;
  const install = installKey ? dayIndex(installKey) : null;
  const offsets = install === null ? [] : m.activeDays.map((k) => dayIndex(k) - install);
  const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

  return {
    cups: entries.length,
    cupsShared,
    shareRate: entries.length ? cupsShared / entries.length : null,
    shareTaps: sum(m.shareTaps),
    sharesCompleted: sum(m.sharesCompleted),
    topApps: Object.entries(m.sharesByApp).sort((a, b) => b[1] - a[1]).slice(0, 4),
    medianCaptureSec: median === null ? null : Math.round(median / 100) / 10,
    under10sRate: times.length ? times.filter((t) => t < 10_000).length / times.length : null,
    abandonRate: m.newOpened ? Math.max(0, 1 - m.newSaved / m.newOpened) : null,
    daysSinceInstall: install === null ? null : dayIndex(keyOf(now)) - install,
    activeDayCount: m.activeDays.length,
    returnedD1: offsets.some((o) => o >= 1),
    returnedD7: offsets.some((o) => o >= 7),
    returnedD30: offsets.some((o) => o >= 30),
    clubInterested: !!m.clubInterestAt,
    clubViews: m.clubViews,
  };
}

const BACKUP_EVERY_DAYS = 30;

/** Ana sayfada "yedek al" hatırlatması gösterilsin mi: en az 10 fincan ve son 30 günde yedek/erteleme yok. */
export function needsBackupNudge(m: Metrics, cups: number, now: Date = new Date()): boolean {
  if (cups < 10) return false;
  const last = [m.lastBackupAt, m.backupNudgeAt].filter((x): x is string => !!x).map((x) => Date.parse(x));
  if (!last.length) return true;
  return now.getTime() - Math.max(...last) >= BACKUP_EVERY_DAYS * DAY_MS;
}
