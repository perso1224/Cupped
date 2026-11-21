import { computePalateTypeId } from './palate';
import type { Method, TasteNote, VenueKind } from './types';

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
