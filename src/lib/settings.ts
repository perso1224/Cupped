/** Kullanıcı ayarları (sadece bu telefonda). Saf model + doğrulama; kayıt storage.ts'te. */
export type Settings = {
  haptics: boolean; // titreşimler
  reduceMotion: boolean; // uygulama içi animasyonları azalt (sistem ayarına ek)
  reminderHour: number; // hatırlatma saati
  reminderMinute: number;
  caffeineRef: number; // günlük kafein referansı (mg)
  showCaffeine: boolean; // ana sayfada kafein sayfası
};

export const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  reduceMotion: false,
  reminderHour: 20,
  reminderMinute: 30,
  caffeineRef: 400,
  showCaffeine: true,
};

/** Ayarlar ekranındaki seçenekler. */
export const REMINDER_TIMES: [number, number][] = [
  [9, 0],
  [13, 0],
  [17, 30],
  [20, 30],
  [22, 0],
];
export const CAFFEINE_REFS = [200, 300, 400];

export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const int = (v: unknown, d: number, min: number, max: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : d;
  };
  return {
    haptics: bool(r.haptics, DEFAULT_SETTINGS.haptics),
    reduceMotion: bool(r.reduceMotion, DEFAULT_SETTINGS.reduceMotion),
    reminderHour: int(r.reminderHour, DEFAULT_SETTINGS.reminderHour, 0, 23),
    reminderMinute: int(r.reminderMinute, DEFAULT_SETTINGS.reminderMinute, 0, 59),
    caffeineRef: int(r.caffeineRef, DEFAULT_SETTINGS.caffeineRef, 50, 1000),
    showCaffeine: bool(r.showCaffeine, DEFAULT_SETTINGS.showCaffeine),
  };
}

export function timeLabel(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
