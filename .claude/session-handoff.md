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

## Update (later the same day)
- Rules: replies must be short (AGENTS.md). Build for iOS and Android.
- Done since: Android share fix (expo-sharing); theme reload only on tab screens; scoring rework (cumulative XP levels in `XP_LEVELS`, chain penalty 0, return/month discovery bonuses); home/progress simplification; badges (12 + art in `assets/badges`, frame redrawn by script); "dün" backfill; quick-add prefill; beta section hidden (tap Sürüm 5×); coffeeTime unified; onboarding 3 questions; Turkish type names; backup date + nudge (`metrics.lastBackupAt/backupNudgeAt`); rescore after delete/edit (`lib/rescore.ts`); Kulüp hidden (`FEATURES.club`); Damak Uyumu (`lib/match.ts`, `/match`, 6-char code); Fincan Duvarı (`/wall`, December banner); Damak Evrimi (`/evolution`); invite line with damak kodu on share cards; intro animation (`BrandIntro`).
- TestFlight prep: `eas.json` (production → channel preview), `.github/workflows/testflight.yml` (manual, needs secrets ASC_API_KEY_P8/ASC_API_KEY_ID/ASC_API_ISSUER_ID/APPLE_TEAM_ID). Never run yet; env var names not verified against docs (docs.expo.dev blocked here).
- Waiting on: owner's Apple Developer membership activation; then App Store Connect app + API key + GitHub secrets, run the workflow.
- Deferred: app address/QR on cards; Kulüp contact.

## Update (third session) — micro-animations
- Tab switch uses `animation: 'shift'` ('none' when reduce motion is on).
- Tab bar: one sliding highlight capsule (instead of per-tab fade) and an icon bounce when a tab is selected.
- Tapping the active tab scrolls to the top: `useTabScrollRef()` in `TabBar.tsx` (wraps `useScrollToTop`).
- `Segmented`: sliding selected box.
- `GrowBar` in `motion.tsx`: XP and weekly-discovery bars fill up.
- Not yet verified on device.
- iPhone tab bar is now Apple's native one (`NativeTabs` from `expo-router/native-tabs` in `(tabs)/_layout.tsx`), which is full Liquid Glass on iOS 26.
  - Android and web keep the custom `TabBar`.
  - "+" is the `add` trigger with `disabled`; its tabPress pushes `/new`. On iOS 26.1+ it has `role="search"`, so it sits separately as a circle.
  - Screens use `disableAutomaticContentInsets`; `useTabBarSpace` has an iOS branch.
  - Not yet verified on iPhone. Check the bottom spacing, the "+" circle, and whether it works in Expo Go.
- Liquid Glass buttons (iOS 26+ only, via `GlassIconButton` in `NavButtons.tsx`):
  - `BackButton` becomes a 44pt glass circle with a chevron only.
  - Also glass: `CloseButton`, the Profile gear, and the CupDetail photo buttons (with a dark tint).
  - Older iOS and Android keep the old look. Not yet verified on iPhone.
- Share buttons are glass on iOS 26+:
  - `PillButton glass` is used in card, wall, evolution and match (×2).
  - wrapped uses a glass background with the slide's fg text color.
- Verified on iPhone by the owner: native tabs, glass back/close/gear buttons, glass share buttons.
- Still to verify: the micro-animations on Android (tab shift, sliding highlight, scroll-to-top).
- New-cup flow animations:
  - Fresh result screen: staggered `FadeIn` (`disabled` prop when not fresh), and `Confetti` (motion.tsx) plus `haptic.medium` at about 1.15 s, when the score lands.
  - `MetricTile` bars use `GrowBar`.
  - new.tsx: the form fades in after the photo step, the details block fades in, and the save button pops when it becomes ready (`Pop skipInitial`).
  - Not yet verified on device.
