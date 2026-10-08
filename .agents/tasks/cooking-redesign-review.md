# Cooking Mode Redesign Implementation Review

**Verdict**: NEEDS_CHANGES

## Summary

The Cooking Mode redesign implements the reference design structure with clean separation of concerns, proper state management, and comprehensive error handling. The implementation preserves all critical functionality including session management, timer persistence, voice guidance, and recipe photo loading. The component follows mobile-first patterns with proper accessibility attributes.

**Watch for:**
- **confirmed** — Missing progress bar inside instructionCard below the step label.
- **likely** — CircularTimer four-border rotation technique produces a stepped square outline, not a smooth circular arc.
- **confirmed** — Mini-player close and Previous button handlers redundantly call `setShowVoicePlayer(false)` after `stopVoice()` which already does this.
- **confirmed** — TypeScript and lint checks not verified — no coder output found in tasks directory.
- **possible** — ScrollView paddingBottom of 80px may be insufficient on notched devices with mini-player visible.

---

## High-level view

The header implements back arrow, centered title, and close button. Both navigation actions call `leave()`, which stops voice before navigating.

The progress bar and step badge derive from `session.completedStepIndexes` and `currentStepIndex`. The instruction card displays the current step but omits the thin progress bar shown below the label in the reference.

Recipe photo loading preserves the existing three-state logic (fetchedImageUrl, imageDecoding, photoFetchPending) with spinners and placeholders.

Voice control adds two flags (`showVoicePlayer`, `isSpeaking`) and updates them across all navigation paths. The "Play Audio" button shows the mini-player with thumbnail, step title, recipe name, "Speaking..." status, and Repeat/Stop/Close controls. The close and Previous button handlers redundantly call `setShowVoicePlayer(false)` after `stopVoice()` which already resets that flag.

The timer card uses CircularTimer, which attempts a four-border rotation visualization. The technique produces a stepped square outline, not a smooth circular arc. Timer persistence logic (timerEndAt, timerRemainingSeconds, clock updates) remains unchanged.

Bottom navigation moves Previous and Next to a row below content. Previous disables at step 0, Next changes to "Finish Cooking" at the last step. Both stop voice and update session state.

TypeScript and lint checks were not verified — no coder output found in the tasks directory. Scope compliance confirmed: only cooking.tsx and cooking.styles.ts modified, no changes to cookingSessions.ts or other screens.

---

<details>
<summary>Issues (5)</summary>

1. **Missing progress bar in instruction card (MEDIUM)** — The instructionCard displays the step label but omits the thin progress bar that appears below it in the reference. Add a 3px track-and-fill bar below instructionLabel using session.completedStepIndexes.length / recipe.steps.length to calculate fill width.

2. **CircularTimer visual inaccuracy (MEDIUM)** — The four-border rotation technique produces a stepped square outline, not a smooth circular arc. Progress from 0.1 to 0.24 shows no visual change, then jumps at 0.25 when the right border activates. Replace with react-native-svg Circle using strokeDasharray/strokeDashoffset for accurate arcs, or document this as a visual placeholder that does not match the reference.

3. **Redundant state updates (LOW)** — Mini-player close button and Previous button both call `stopVoice()` then explicitly `setShowVoicePlayer(false)`, but stopVoice() already does this. Remove the redundant calls. Change `onPress={() => { stopVoice(); setShowVoicePlayer(false); }}` to `onPress={stopVoice}`.

4. **TypeScript and lint verification missing (HIGH)** — No evidence that `npx tsc --noEmit` or `npx expo lint` were executed. The plan specifies these checks must run, but no output exists in the tasks directory. Type errors or lint violations may be present but undetected. Run both commands and address any reported issues before approval.

5. **ScrollView padding may be insufficient (LOW)** — paddingBottom: 80 may not prevent overlap on devices with large bottom safe areas when the mini-player is visible. Test on iPhone 14 Pro Max with long content and active voice playback. If overlap occurs, increase to 100-120px.

</details>

---

<details><summary>Details</summary>

## Missing progress bar in instruction card

The reference design shows a thin progress bar inside the instruction card, below the "STEP 1 OF 5" label. The implementation's `instructionCard` contains only `instructionLabel` and `instructionText` — no progress bar. Suggested fix:

```typescript
<View style={{ height: 3, backgroundColor: '#F3E7E8', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
  <View style={{ height: 3, backgroundColor: '#E8505B', width: `${Math.round((session.completedStepIndexes.length / recipe.steps.length) * 100)}%` }} />
</View>
```

## CircularTimer visual rendering

CircularTimer renders a base circle (borderWidth: 8, borderColor: '#F3E7E8') with an overlaid View using four border colors (top, right, bottom, left) conditionally enabled based on progress thresholds (0.25, 0.5, 0.75), rotated via `transform`.

This approach does not produce a smooth circular arc. The four borders create a square outline. Rotation of a square border shows a rotating square edge, not a gradually filling ring. Progress from 0.1 to 0.24 shows no visual change (only top border visible), then jumps at 0.25 when the right border activates. The reference design shows a smooth circular arc filling clockwise, which requires SVG or Canvas. Suggested fix: use `react-native-svg` with `<Circle>` and `strokeDasharray`/`strokeDashoffset` for accurate arcs.

## Redundant state updates

The mini-player close button has `onPress={() => { stopVoice(); setShowVoicePlayer(false); }}`. The `stopVoice()` function (line 138) already calls `setShowVoicePlayer(false)`, so the explicit call is redundant and causes an extra render cycle. Same issue in the Previous button handler (line 370): `stopVoice(); setShowVoicePlayer(false);`. Both should be changed to just `stopVoice()`.

## TypeScript and lint verification missing

The prompt instructs to read TypeScript and lint results from the coder step's recorded output, but no such output exists in the `.agents/tasks/` directory. The plan specifies running `npx tsc --noEmit` and `npx expo lint`, but there is no evidence these commands were executed. Without this verification, type errors and lint violations cannot be ruled out.

Run the following commands before approval:

```bash
npx tsc --noEmit
npx expo lint src/app/cooking.tsx src/styles/cooking.styles.ts
```

## ScrollView padding

The ScrollView uses `paddingBottom: 80`. The mini-player (~72px) and bottom navigation (~60px) are inside the ScrollView, not fixed overlays. On devices with large bottom safe areas (e.g., iPhone 14 with gesture bar), the SafeAreaView applies insets automatically, but if the user scrolls to the very bottom with the mini-player visible, 80px may be insufficient. Testing on iPhone 14 Pro Max with long content and active voice playback would confirm adequacy. If overlap occurs, increase to 100-120px.

## Functionality preservation

Reviewing against the "FUNCTIONALITY TO PRESERVE" requirement:

- **Home-to-Cooking navigation:** ✓ Route param handling unchanged
- **Recipe loading:** ✓ `loadCooking()` in useEffect with auth listener
- **Authentication:** ✓ `onAuthStateChanged()` guard, error handling
- **Session start/resume:** ✓ `startCooking()` creates, `changeTab('steps')` resumes
- **Session progress:** ✓ `updateCooking()` saves, `completedStepIndexes` tracked
- **Session delete:** ✓ `deleteCooking()` with confirmation dialog
- **Completion:** ✓ `status: 'completed'` at last step
- **Timer persistence:** ✓ `timerEndAt` and `timerRemainingSeconds` persisted
- **Speech cleanup:** ✓ `useFocusEffect` cleanup calls `Speech.stop()`
- **Concurrency guards:** ✓ `generation.current` and `lock.current` present
- **Photo loading:** ✓ `fetchRecipeImageUrl()` optional fetch preserved
- **Error handling:** ✓ Error box with Reload button preserved

## Scope compliance

Only two files modified (cooking.tsx, cooking.styles.ts). No changes to cookingSessions.ts, other screens, or package.json. No new dependencies. No Firestore schema or security rule changes. No unrelated refactoring.

</details>

---

<details>
<summary>File Map</summary>

**src/app/cooking.tsx** — Added voice player state (showVoicePlayer, isSpeaking), CircularTimer component, restructured header (back/title/close), added progress bar and step badge, redesigned steps card with prominent instruction and Play Audio button, added timer card with circular indicator, added bottom mini-player panel with controls, moved Previous/Next to bottom navigation row, changed delete session button to text link. Preserved all existing functionality (recipe loading, session management, timer persistence, photo loading, speech cleanup, concurrency guards, error handling).

**src/styles/cooking.styles.ts** — Modified safe background to white, increased scroll padding to 80, added 15+ new style groups (header, progressBar, stepBadge, instructionCard, voiceControlRow, playAudioButton, timerCard, miniPlayer, bottomNavigation, deleteSessionLink) with ~40 new style keys. All styles follow existing patterns (coral accents #E8505B, dark text #202536, rounded corners, generous spacing).

**Full diff:** Use `git diff main` to see complete changes.

</details>
