# Session Handoff — Cupped (2026-11-22)

## Current goal
Cupped: an Expo SDK 58 / React Native coffee-logging app ("damak kimliği"). Turkish UI.

The user is non-technical, a student, and has no computer (iPhone/iPad only). Explain things to them in simple Turkish.

The user's workflow is to describe a feature or paste code in chat. Claude implements it, runs checks, and pushes. The GitHub Action then publishes an EAS Update to the `preview` channel, and the user tests in the app on their iPhone.

There is no open task right now. The overnight autonomous pass is done. The user just asked whether they can paste code for Claude to apply, and the answer was yes.

## Branch / delivery
- Work and push only on `claude/expo-setup-guide-9xz45k`. Do not open a PR unless the user asks.
- HEAD is `5c6aa1a`, pushed, with a clean tree.
- Each push triggers `.github/workflows/expo-update.yml`. It runs npm ci, test, typecheck and lint, then `eas update --branch preview --platform ios`. `.md`/docs changes are ignored by the trigger. Runs 20–23 succeeded.
- Before declaring work done: `npx tsc --noEmit`, `CI=1 npx expo lint`, `npx vitest run` (92 tests).
- Web check: `npx expo export -p web --output-dir <scratchpad>/web`, then Playwright scripts in the scratchpad (v3.js edit flow, v4/v5/v7.js).
- Commit messages are in Turkish and end with the Co-Authored-By and Claude-Session lines from the system reminder.

## Changed files (overnight, from 9a80315 to 5c6aa1a)
- `src/app/new.tsx`:
  - edit mode `?edit=<id>`: prefilled form, `saveEdit` rescores against the entries before this one, `updateEntry`.
  - "same again" mode `?again=<id>`.
  - `maxLength` on inputs.
  - `photoWidth` ref.
  - gallery error handling.
  - Close on the photo step while editing returns to the form.
- `src/components/CupDetail.tsx`:
  - rows: Aynısından bir tane daha (detail mode only), Düzenle, Sil.
  - `useFocusEffect` reload that skips when the entry is unchanged and re-locks Share when the photo changes.
  - score parts on one row.
- `src/lib/storage.ts`:
  - `updateEntry`, `discardPhoto`.
  - `persistPhoto(tempUri, id, {version,width})`.
  - `readEntriesStrict` saves a lossy or corrupt raw copy to `.corrupt.<ts>`; if there is no backup it continues with an empty list.
  - `loadEntries` is read-only.
  - `updateSettings` writes before notifying listeners.
  - import cap of 20k entries.
  - old export files are cleaned up.
  - `shrinkPhoto` decodes once.
- `src/lib/entries.ts`:
  - `parseEntriesDetailed` (dropped/lossy count).
  - `createdAt` normalized to ISO.
  - notes and grind whitelisted, notes capped at 2.
  - brew values coerced.
  - text caps: name 80, note 500.
- `src/lib/reminderTime.ts`, `src/lib/reminders.ts`: `reminderPlan` schedules the first reminder plus 6 daily follow-ups (ids `cupped-daily`, `cupped-daily-1..6`).
- `src/lib/scoring.ts`, `src/lib/progress.ts`:
  - exported `placeKey`, used everywhere; chain branches count as one place.
  - `PassportPlace.key`, `filterEntries`.
- `src/lib/metrics.ts`: `dayIndex` uses `Date.UTC`.
- `src/app/history.tsx`: `?place=&title=` / `?method=` filters plus a summary line; memoized grouping.
- `src/components/PassportView.tsx`: places and earned method stamps are pressable and open the filtered history.
- `src/components/motion.tsx`: PressScale gets `accessibilityRole="button"` and a disabled state by default.
- `src/components/ui.tsx`: Chip has a selected state.
- `src/components/List.tsx`: ListRow shrink rules (short values never truncate); Switch is labelled.
- `src/app/onboarding.tsx`, `src/app/settings.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/profile.tsx`, `src/app/(tabs)/progress.tsx`: try/catch around async calls; "Tüm fincanlar" is hidden when there are no entries.
- `src/i18n/tr.ts`: new strings for edit, again, errors, filterSummary and shutter.
- Tests: `entries.test.ts`, `progress.test.ts`, `reminderTime.test.ts`.
- Docs: `CUPPED_OVERNIGHT_REPORT.md` (full morning report), `CUPPED_OVERNIGHT_PROGRESS.md`.

## Decisions made
- **Product (user):**
  - Düello/QR is out of scope.
  - Scoring: base 40, office 5, depth +5/+5, new-place bonus at most 2 per week.
  - Level is hidden on share cards.
  - Daily reminder that the user can turn off.
  - Photo "is it coffee" check comes later, on-device, warn only, iOS + Android.
- **Engineering (overnight):**
  - Editing preserves id, createdAt and list order. The score is recomputed from entries before this one. Later entries are not rescored; scores are historical snapshots.
  - Not done; these need the user's decision: personal like/star rating (changes product identity), dark mode, enabling React Compiler (needs on-device testing).
  - Do not copy Cal AI or Spotify designs exactly. Use Ionicons, not emoji. Respect reduce motion and haptics settings.

## Failing tests
None. `tsc` and lint are clean and 92/92 Vitest tests pass. `expo-doctor` has 2 checks that fail only because there is no network access to exp.host; this is not a project problem.

## Root cause (of the overnight fixes)
- **Data loss:**
  - The repair path wrote `[]` over corrupt data when no backup existed.
  - `loadEntries`, which was not queued, did repair writes that raced with saves.
  - Records that failed or partially failed normalization were silently dropped on the next write.
- **Reminder stopped:** only a single DATE trigger was scheduled, and only when the app opened.
- **Place inconsistency:** scoring used chain-aware keys while progress, passport and badges used `normalizePlace` (which gives an empty key for non-Latin names).
- **SE truncation:** ListRow had a non-shrinking title, a spacer with an extra gap, and short values that were allowed to shrink.

## Next step
- Wait for the user's next request; they may paste code or describe features.
- Ask the user for iPhone feedback on: Düzenle, Aynısından bir tane daha, Pasaport → mekan list, reminder time display.
- Possible later work:
  - FlatList virtualization for history at 500+ entries.
  - thumbnails.
  - backing up photos (zip).
  - TestFlight once the user buys an Apple Developer account.
  - on-device coffee check (`docs/YOL_HARITASI.md`).
