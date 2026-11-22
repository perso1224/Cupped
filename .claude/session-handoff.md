# Session Handoff — Cupped (2026-11-22, second session)

## Context
Expo SDK 58 / React Native coffee-logging app, Turkish UI. The owner is non-technical, uses an iPhone, and now also tests on an Android phone via Expo Go. Explain everything in simple Turkish.

## Rules
- Build every change for **both iOS and Android** unless the owner says otherwise (see AGENTS.md "Platforms").
- Push to `claude/expo-setup-guide-9xz45k` only. Do not open a PR unless asked.
- Each push runs `.github/workflows/expo-update.yml`: tests, typecheck and lint, then `eas update --branch preview --platform all`.
- Before declaring work done, run:
  - `npx tsc --noEmit`
  - `CI=1 npx expo lint`
  - `npx vitest run` (104 tests)
  - a web export plus Playwright checks in the scratchpad
- Commit messages are in Turkish and end with the attribution lines.
- The "no schema change" rule from earlier in this session was lifted, for the star rating only.

## Done this session (in order)
- Profile > Collection: separate pages `src/app/collection/{badges,places,methods}.tsx`. The old `collection.tsx` was removed.
- Back button stretched on iOS: fixed with a fixed top bar, and PressScale no longer adds `flexGrow` for `alignSelf` alone.
- Floating tab bar (`src/components/TabBar.tsx`): Liquid Glass on iOS 26+ through `src/components/Glass.tsx` (`expo-glass-effect`, safe require), white fallback otherwise. The "+" button is separate; the Profile tab shows the user's initial.
- Cup screen: hero photo, a sheet, a big score with `CupGauge`, three tiles, and Edit/Done buttons in result mode.
- Progress screen: Level and Streak cards, plus `TrendChart` with 1M/3M/1Y/All ranges (`scoreTrend`).
- Coffee picker for origins: `src/config/origins.ts` and `OriginPicker`. It writes to the `origin` string field.
- Coffee identity:
  - Fraunces font via `@expo-google-fonts/fraunces`; `fonts` in `theme.ts`.
  - `CupGauge` and `Bean` in `src/components/coffee.tsx`.
  - Stamp-style `WeekStrip`.
  - Bar-style `MetricTile`.
- React Compiler enabled in `app.json` (`experiments.reactCompiler`).
- Home page: a swipeable "menu board" pager with at most 5 pages: Today, Caffeine (if enabled), Streak, Taste map, Favorites.
  - Light theme: white cards. Dark theme: espresso cards.
  - Pager uses `bleed` so card shadows are not clipped.
- Dark mode:
  - `theme.ts` picks LIGHT or DARK when the app opens.
  - `black`/`white` are an ink pair that swap in dark mode; `onColor` is always white.
  - The theme preference (system/light/dark) is stored in `Documents/cupped-theme.txt` (localStorage on web) and read synchronously.
  - Changing it calls `Updates.reloadAsync()`.
- Android pass:
  - Settings pickers use `useChoice()`: Alert on iOS, bottom sheet on Android and web.
  - Card `elevation` and ListRow ripple.
  - Hardware back button on the new-cup screen.
  - `KeyboardAvoidingView`; the save bar hides while the keyboard is open (Android only).
  - History screen uses FlatList.
  - Notification channel `reminders`.
- Personal star rating:
  - `CupEntry.rating` (1–5 or null) via `ratingOrNull`.
  - `StarInput` and `Stars` components.
  - `placeRatings` and `favorites().loved`.
  - Editing keeps the score when the scoring inputs are unchanged.

## Verified by owner on device
- iPhone: the collection pages, glass tab bar, switches, home pager, and stars.
- Android: general UI, Wrapped (no animation there because system animations are off — expected), keyboard, back button, and stars.

## Open / ideas
- On Android, not yet confirmed: the 4-option sheet under "Damak hedefi", and the reminder actually arriving.
- Share card follows the theme (dark in dark mode); the owner has not decided whether it should always be light.
- TestFlight / Play Store prep is in `docs/YOL_HARITASI.md`.
