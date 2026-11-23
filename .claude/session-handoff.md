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
  - `npx vitest run` (122 tests)
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
- Verified by the owner on device: the new-cup flow animations (confetti, staggered result, details fade).
- Badge celebration: `CelebratedBadge` (BadgeArt.tsx) on the fresh result screen. The badge springs in, gold rays rotate behind it, and `haptic.success` fires.
- Delete animation: `useAnimatedRemovals` (motion.tsx) in history and home. A removed cup fades out about 380 ms after returning, and the rows below slide up (LayoutAnimation).
- Home entrance:
  - `setIntroPlaying`/`useIntroDone` (motion.tsx) hold home content until BrandIntro ends.
  - Then the header, week strip, pager, cards and recent cups stagger in.
  - The body is not rendered while entries is null.
- Not yet verified on device.
- Passport tab redesign:
  - Methods are round ink stamps (`MethodStamp`): icon plus cup count, a slight tilt, and a "stamping" pop.
  - Palate types are rectangular "VİZE" stamps (`VisaStamp`).
  - Locked items are faint dashed blanks.
  - These stamps are non-interactive (the owner's decision). The method → history filter is still in Profile > Koleksiyon > Yöntemler.
- Passport stamps: the frames are drawn with SVG (rotated inside the SVG), because rotated RN border views look jagged on iOS. Only the text and icon use an RN rotate.
- App Store prep:
  - `docs/APP_STORE.md` has the TestFlight test info, store texts (checked against character limits), category, age rating, App Privacy ("Data Not Collected") and a screenshot plan.
  - `docs/gizlilik.html` is the public privacy policy.
  - Waiting on the owner: a contact e-mail, and where to host the privacy page (GitHub Pages needs a public repo).
- Audit by 5 agents: the consolidated findings are in `docs/DENETIM_RAPORU.md` (A–E, with ☐/☑/❓ status).
- Audit fixes, part A (store blockers):
  - Android adaptive icon (rings from icon.png, solid #D98B2B background, monochrome) and favicon.
  - `expo-splash-screen` (light and dark rings) and `expo-system-ui` installed.
  - `NSPhotoLibraryAddUsageDescription` and `CFBundleLocalizations: [tr]` added. `blockedPermissions` covers WRITE_SETTINGS, SYSTEM_ALERT_WINDOW and RECORD_AUDIO.
  - eas.json:
    - `testflight` profile uses channel preview; the TestFlight workflow uses it.
    - `production` profile uses channel production.
    - The expo-update workflow runs only on the dev branch.
  - `IS_STORE_BUILD` (src/lib/build.ts) hides the beta stats screen in store builds.
  - The privacy texts are synced.
  - APP_STORE.md declares Device ID (expo-updates client id), adds English review notes, and fixes the Instagram wording.
  - Note: `npx expo install` can't reach api.expo.dev here. Install with npm using the versions in `node_modules/expo/bundledNativeModules.json`.

## Overnight (22–23 Nov), audit fixes — all of docs/DENETIM_RAPORU.md A–E done
- Owner decisions made on their behalf (listed in the report, section C) and open to change:
  - stable palate type with a "tahmin" label for the first 5 cups
  - a score explanation link
  - "en iyi" vs "ort." labels
  - discard confirm "Çık, kaydetme" / "Düzenlemeye dön"
  - theme reload returns to Settings
- Architecture changes:
  - `src/lib/entryStore.ts`: cups are stored in a file on native (Documents/data/entries.json + .bak), with an atomic write and AsyncStorage migration; web uses AsyncStorage.
  - `storage.ts`:
    - in-memory entries cache with `subscribeEntries`; `useEntries` subscribes
    - rescore after a backdated save and after import
    - `setReturnRoute` / `consumeReturnRoute`
    - recovery notice
    - thumbnails in `cups/thumbs/` (`thumbUrl`)
  - `scoring.ts`: `HistoryIndex` + `discoveryPoints`. `rescore.ts` is now single-pass (equivalence test against the old algorithm).
  - `palate.ts`: `computePalateTypeId` adds hysteresis (2 of the last 3 prefixes); `rawPalateTypeId` is the old logic.
  - `src/lib/cupSave.ts`: `createCup` / `editCup` / `parseNum`. new.tsx only gathers the form.
  - `src/lib/safe.ts`: `safely()` instead of try/finally in components (React Compiler can't handle try/finally). All .tsx files now compile with the compiler.
  - `src/lib/build.ts`: `IS_STORE_BUILD` (channel "production").
  - eas.json has `testflight` (channel preview) and `production` (channel production) profiles; the expo-update workflow runs only on the dev branch.
  - `METHODS` / `NOTES` / `VENUES` / `GRINDS` constants live in `types.ts`.
  - `src/config/methodStyle.ts`: method icons and inks.
  - `src/components/Emblem.tsx` (shared by the card and onboarding), `src/components/EmptyState.tsx`.
  - expo-splash-screen and expo-system-ui installed. `npx expo install` can't reach api.expo.dev here; use the versions in `node_modules/expo/bundledNativeModules.json`.
- Tests: 141 (vitest), including storage regression tests (corrupt data, backdated save, import rescore, unknown fields) and cupSave parsing.
- Not verified on device: all of the above. Key checks:
  - the file-storage migration on an existing install (existing cups must still be there)
  - the Android icon
  - the splash screen
  - VoiceOver on Wrapped
- TestFlight: `docs/TESTFLIGHT.md` has the owner's step list.
  - Verified from the eas-cli 27.11 source:
    - The EXPO_ASC_*/EXPO_APPLE_TEAM_ID env var names are correct.
    - A non-interactive build can't create the distribution certificate, so the owner must run `eas credentials` once interactively.
    - Non-interactive submit needs `ascAppId` in the eas.json submit profile.
    - The API key needs the Admin role.
  - Waiting on the owner for the ASC app's Apple ID number, then add `"ascAppId"` to `submit.testflight.ios` and `submit.production.ios`.
- 23 Nov morning: second verification round (code review, visual/a11y, first-time user); all findings fixed.
  - New: `InfoSheet` (ChoiceSheet.tsx) for the score explanation; `palateReason` (Profile "Neden" line); choose() takes a `current` value (✓ mark); PillButton has an `onDark` variant (camera permission).
  - The Wrapped screen-reader nav sits on its own row; the CupDetail top bar is first in reading order (zIndex).
  - Inline error on Damak Uyumu; GrowBar label/value.
- Tests: 150.

## Update (23 Nov afternoon) — first TestFlight upload done
- PR #1 (dev → main) merged by the owner. `main` now has the whole app.
- Owner ran `eas credentials -p ios` on Windows. On EAS now: distribution cert (until 23 Nov 2027), provisioning profile, EAS Submit ASC API key (ADMIN, team 8SU4USQK9K).
- `ascAppId` 6838273482 is in eas.json. On main only in `testflight`; the dev branch also has it in `production` (send it in a later PR).
- testflight.yml: only EXPO_TOKEN is required. The ASC_* GitHub secrets are optional and not set.
- The first run from main: build 1.0.0 (1) finished, and the App Store submission succeeded.
- Next: Apple processing, an internal tester group in App Store Connect, and install via the TestFlight app.
- For later releases, the workflow builds the branch it is dispatched from. Either pick the dev branch in "Run workflow" or bring main up to date with a PR first.

## Update (23 Nov evening) — roadmap items 10 and 11: coffee photo check and Instagram Stories
- New native dependencies, so a new EAS build is needed:
  - `react-native-fast-tflite` 3.0.1 and `react-native-nitro-modules` 0.37.2
  - `react-native-share` 12.3.1, whose config plugin needs `expo-build-properties` ~58.0.12
  - `jpeg-js` (pure JS)
- None of these are in Expo's bundledNativeModules. Native compatibility with RN 0.88 is unverified: there is no Android SDK or Xcode here (dl.google.com is blocked). `expo prebuild` works, and the iOS/Android/web exports work.
- Coffee check:
  - `src/lib/coffeeCheck.ts` (pure, tested), `coffeeCheckRunner.ts` (safe lazy require; null when the module is missing)
  - `metro.config.js` adds the `tflite` asset extension
  - `CupEntry.photoCheck` ('coffee' | 'unsure' | 'skipped' | null)
  - The new.tsx notice is a non-blocking card with a "Yeniden çek" button
- Instagram Stories:
  - `src/lib/share.ts`: `chooseTarget()` shows an Alert with "Instagram Hikayesi / Diğer uygulamalar / Vazgeç", only when `INSTAGRAM.appId` (in `src/config/brand.ts`) is set, the module exists and Instagram is installed.
  - On Android, the temp file is not released on the story path.
  - Waiting on the owner for the Meta App ID.
- Tests: 163.
- Automation (23 Nov evening): the expo-update.yml workflow now computes the iOS fingerprint (`eas fingerprint:generate --build-profile testflight`) on every dev-branch push.
  - If no non-errored testflight build has that fingerprint, it starts `eas build -p ios --profile testflight --auto-submit --no-wait`.
  - The OTA update is still published either way.
  - runtimeVersion stays `appVersion`. Because of that, an OTA also reaches older builds, so new native modules must always be required safely (try/catch), as done in coffeeCheckRunner.ts and share.ts.
  - App Store release stays manual (owner decision + Apple review).
- Build location (23 Nov): the expo-update.yml `ios-build` job runs on macos-latest with `eas build --local` plus `eas submit --path` when the repo is PUBLIC.
  - That is free: local builds don't use EAS quota, and public-repo macOS minutes are free. Success is marked by git tag `ios-fp-<fingerprint>`.
  - When the repo is PRIVATE, the job falls back to an EAS cloud build.
  - The owner wants to make the repo public "for the start"; that is the owner's action in GitHub settings.
  - A secret scan of the history found no keys. The commit author email will be visible.
