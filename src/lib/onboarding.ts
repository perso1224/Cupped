import { computePalateTypeId } from './palate';
import { METHODS, NOTES, type Method, type TasteNote, type VenueKind } from './types';

export type CupsPerDay = 'one' | 'few' | 'many';
export type UsualPlace = 'home' | 'cafe' | 'office' | 'mixed';
export type PalateGoal = 'explore' | 'brew' | 'taste' | 'log';

export type OnboardingAnswers = {
  cupsPerDay: CupsPerDay;
  usualPlace: UsualPlace;
  favMethod: Method;
  notes: TasteNote[]; // en fazla 2
  goal: PalateGoal;
  nickname: string;
};

export type Profile = OnboardingAnswers & {
  onboardedAt: string;
  starterTypeId: string;
};

const PLACE_TO_VENUE: Record<UsualPlace, VenueKind> = {
  home: 'home',
  cafe: 'independent',
  office: 'office',
  mixed: 'independent',
};

/** Onboarding cevaplarından başlangıç damak tipi (henüz fincan yokken gösterilir). */
export function starterPalateTypeId(a: Pick<OnboardingAnswers, 'usualPlace' | 'favMethod' | 'notes'>): string {
  return computePalateTypeId([
    {
      method: a.favMethod,
      venueKind: PLACE_TO_VENUE[a.usualPlace],
      placeName: null,
      notes: a.notes.slice(0, 2),
      createdAt: new Date(0).toISOString(),
    },
  ]);
}

const CUPS: CupsPerDay[] = ['one', 'few', 'many'];
const PLACES: UsualPlace[] = ['home', 'cafe', 'office', 'mixed'];
const GOALS: PalateGoal[] = ['explore', 'brew', 'taste', 'log'];

/**
 * Saklanan profili doğrular, eksik/bozuk alanları varsayılanla doldurur (ör. metin olmayan takma ad
 * ekranı çökertmesin). Hiç okunamıyorsa null (tanıtım yeniden gösterilir). Bilinmeyen alanlar korunur.
 */
export function normalizeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const pick = <T,>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
  const notes = Array.isArray(r.notes) ? [...new Set(r.notes.filter((n): n is TasteNote => NOTES.includes(n as TasteNote)))].slice(0, 2) : [];
  return {
    ...r,
    cupsPerDay: pick(r.cupsPerDay, CUPS, 'few'),
    usualPlace: pick(r.usualPlace, PLACES, 'mixed'),
    favMethod: pick(r.favMethod, METHODS, 'filter'),
    notes,
    goal: pick(r.goal, GOALS, 'explore'),
    nickname: typeof r.nickname === 'string' ? r.nickname.slice(0, 40) : '',
    onboardedAt: typeof r.onboardedAt === 'string' && !Number.isNaN(Date.parse(r.onboardedAt)) ? r.onboardedAt : new Date(0).toISOString(),
    starterTypeId: typeof r.starterTypeId === 'string' && r.starterTypeId ? r.starterTypeId : 'third_wave_nomad',
  };
}
