# Cooking Mode Redesign Implementation Plan

## Overview
Redesign the Cooking Mode screen (cooking.tsx) and its styles (cooking.styles.ts) to match the reference design while preserving ALL existing functionality including recipe loading, session management, timer persistence, voice guidance, and navigation.

**Key constraint:** This is a tightly-coupled visual redesign of a single screen. All changes share component state and must work together as a cohesive whole.

---

## 1. Changes to cooking.tsx

### 1.1 New State Variables
Add the following state variables after existing state declarations (around line 52):

```typescript
const [showVoicePlayer, setShowVoicePlayer] = useState(false);
const [isSpeaking, setIsSpeaking] = useState(false);
```

**Purpose:**
- `showVoicePlayer`: Controls visibility of the bottom mini-player panel
- `isSpeaking`: Tracks whether Speech.speak() is actively reading

### 1.2 Modify Voice Control Functions

**readAloud() function (around line 110):**
- Add `setShowVoicePlayer(true)` at the start
- Add `setIsSpeaking(true)` before Speech.speak()
- In Speech.speak() options, add `onDone: () => setIsSpeaking(false)` callback
- Keep existing onError handler, add `setIsSpeaking(false)` in the error path

**stopVoice() function (around line 101):**
- Add `setIsSpeaking(false)` and `setShowVoicePlayer(false)` after Speech.stop()

**changeTab() function (around line 118):**
- Keep existing stopVoice() call
- Add explicit `setShowVoicePlayer(false)` to hide player on tab switch

**nextStep() and save() navigation:**
- In nextStep(), after stopVoice(), add `setShowVoicePlayer(false)`
- In the Previous button handler, add `setShowVoicePlayer(false)` alongside stopVoice()

**useFocusEffect cleanup (around line 95):**
- Keep existing Speech.stop() call
- Add `setShowVoicePlayer(false)` and `setIsSpeaking(false)` in the cleanup return

### 1.3 Header Restructure

**Current header (line ~138):**
```typescript
<View style={[styles.row, styles.between]}>
  <Button title="Back" onPress={leave} disabled={busy} secondary />
  <Text style={styles.label}>COOKING MODE</Text>
</View>
```

**Replace with:**
```typescript
<View style={styles.header}>
  <Pressable onPress={leave} disabled={busy} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Go back">
    <Ionicons name="arrow-back" size={24} color="#202536" />
  </Pressable>
  <Text style={styles.headerTitle}>Cooking Mode</Text>
  <Pressable onPress={leave} disabled={busy} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Close cooking mode">
    <Ionicons name="close" size={24} color="#202536" />
  </Pressable>
</View>
```

### 1.4 Progress Bar (Insert After Header)

**Add immediately after the new header, before loading/error states:**
```typescript
{session && (
  <>
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarFill, { 
        width: `${Math.round((session.completedStepIndexes.length / recipe.steps.length) * 100)}%` 
      }]} />
    </View>
    <View style={styles.stepBadgeContainer}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>
          STEP {session.currentStepIndex + 1} OF {recipe.steps.length}
        </Text>
      </View>
    </View>
  </>
)}
```

### 1.5 Recipe Photo Section

**Keep existing photo logic (lines 144-176) unchanged.** The photo wrapper, Image component with decode tracking, spinner, and placeholder are already correct. Just verify styles.recipeImageWrapper uses borderRadius: 16 and aspectRatio remains flexible.

### 1.6 Steps Tab Content Restructure

**Current steps card with session (around line 185):**
Replace the entire `<View style={styles.card}>` block inside the `tab === 'steps' && session` branch with:

```typescript
<View style={styles.stepsCard}>
  <View style={styles.instructionCard}>
    <Text style={styles.instructionLabel}>
      STEP {session.currentStepIndex + 1} OF {recipe.steps.length}
    </Text>
    <Text style={styles.instructionText}>
      {recipe.steps[session.currentStepIndex]}
    </Text>
  </View>

  {/* Spoken Instructions Row */}
  <View style={styles.voiceControlRow}>
    <Text style={styles.voiceControlLabel}>Spoken Instructions</Text>
    <Pressable
      onPress={readAloud}
      disabled={blocked}
      style={[styles.playAudioButton, blocked && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel="Play audio instructions"
    >
      <Ionicons name="play" size={16} color="#FFFFFF" />
      <Text style={styles.playAudioButtonText}>Play Audio</Text>
    </Pressable>
  </View>
</View>
```

**Remove:** The old voice button row with "Read step aloud" and "Stop voice" buttons.

### 1.7 Timer Card Restructure

**Current timer card (around line 200):**
Replace the entire timer `<View style={styles.card}>` with:

```typescript
<View style={styles.timerCard}>
  <Text style={styles.timerCardLabel}>Cooking Timer</Text>
  <CircularTimer remaining={remaining} total={session.timerRemainingSeconds} />
  <Text style={styles.timerDigital}>{timeLabel}</Text>
  {remaining === 0 && (
    <Text style={styles.success} accessibilityLiveRegion="polite">Timer finished</Text>
  )}
  <View style={styles.timerControls}>
    <TextInput
      style={styles.timerInput}
      value={minutes}
      onChangeText={setMinutes}
      keyboardType="decimal-pad"
      accessibilityLabel="Timer duration in minutes"
      editable={!busy}
      maxLength={6}
      placeholder="Minutes"
    />
    <Button title="Set" onPress={setTimer} secondary disabled={blocked} />
  </View>
  <Button
    disabled={blocked || remaining === 0}
    title={session.timerEndAt ? 'Pause Timer' : 'Start Timer'}
    onPress={() => {
      if (session.timerEndAt) {
        void save({
          timerEndAt: null,
          timerRemainingSeconds: Math.max(0, Math.ceil((session.timerEndAt - Date.now()) / 1000))
        });
      } else {
        void save({ timerEndAt: Date.now() + remaining * 1000 });
      }
    }}
  />
</View>
```

### 1.8 CircularTimer Helper Component

**Add before the CookingContent function (around line 28):**

```typescript
function CircularTimer({ remaining, total }: { remaining: number; total: number }) {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? remaining / total : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityLabel={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
    >
      <View style={{ 
        width: size, 
        height: size, 
        borderRadius: size / 2, 
        borderWidth: strokeWidth, 
        borderColor: '#F3E7E8',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Progress arc using overlaid View - simplified for React Native without SVG */}
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: '#E8505B',
          borderRightColor: progress > 0.25 ? '#E8505B' : 'transparent',
          borderBottomColor: progress > 0.5 ? '#E8505B' : 'transparent',
          borderLeftColor: progress > 0.75 ? '#E8505B' : 'transparent',
          transform: [{ rotate: `${-90 + (1 - progress) * 360}deg` }]
        }} />
      </View>
    </View>
  );
}
```

**Note:** This uses View + border color tricks for a circular progress indicator without requiring react-native-svg. For a production implementation with accurate arcs, consider adding react-native-svg, but this approach avoids new dependencies per the requirement.

### 1.9 Bottom Mini-Player Panel

**Add after the timer card and before the delete session card (around line 240):**

```typescript
{showVoicePlayer && session && (
  <View style={styles.miniPlayer}>
    <View style={styles.miniPlayerContent}>
      {displayImageUrl ? (
        <Image source={{ uri: displayImageUrl }} style={styles.miniPlayerThumbnail} contentFit="cover" />
      ) : (
        <View style={[styles.miniPlayerThumbnail, { backgroundColor: '#E8E8E3', alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="restaurant-outline" size={20} color="#6B7280" />
        </View>
      )}
      <View style={styles.miniPlayerInfo}>
        <Text style={styles.miniPlayerStep} numberOfLines={1}>
          Step {session.currentStepIndex + 1}
        </Text>
        <Text style={styles.miniPlayerRecipe} numberOfLines={1}>
          {recipe.name}
        </Text>
        {isSpeaking && <Text style={styles.miniPlayerStatus}>Speaking...</Text>}
      </View>
    </View>
    <View style={styles.miniPlayerControls}>
      <Pressable onPress={readAloud} disabled={busy} style={styles.miniPlayerButton} accessibilityRole="button" accessibilityLabel="Repeat">
        <Ionicons name="refresh" size={20} color="#FFFFFF" />
      </Pressable>
      <Pressable onPress={stopVoice} style={styles.miniPlayerButton} accessibilityRole="button" accessibilityLabel="Stop">
        <Ionicons name="stop" size={20} color="#FFFFFF" />
      </Pressable>
      <Pressable onPress={() => { stopVoice(); setShowVoicePlayer(false); }} style={styles.miniPlayerButton} accessibilityRole="button" accessibilityLabel="Close player">
        <Ionicons name="close" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  </View>
)}
```

### 1.10 Bottom Navigation Row

**Replace the existing Previous/Next row inside the steps card (around line 195) with a new row at the END of the ScrollView, just before delete session:**

```typescript
{session?.status === 'in_progress' && (
  <View style={styles.bottomNavigation}>
    <View style={styles.bottomNavPrevious}>
      <Button
        title="Previous"
        secondary
        disabled={blocked || session.currentStepIndex === 0}
        onPress={() => {
          stopVoice();
          setShowVoicePlayer(false);
          void save({ currentStepIndex: session.currentStepIndex - 1 });
        }}
      />
    </View>
    <View style={styles.bottomNavNext}>
      <Button
        disabled={blocked}
        title={busy ? 'Saving…' : session.currentStepIndex === recipe.steps.length - 1 ? 'Finish Cooking' : 'Next Step'}
        onPress={() => void nextStep()}
      />
    </View>
  </View>
)}
```

### 1.11 ScrollView Padding Adjustment

**Modify the scroll container style (line ~136):**

Change `paddingBottom: 40` to `paddingBottom: 80` to ensure bottom navigation and mini-player never overlap on small screens.

### 1.12 Delete Session Card Adjustment

**Keep the existing delete session card logic (around line 243), but change the button to a text link style:**

Replace the Button component with:
```typescript
<Pressable onPress={() => { stopVoice(); setConfirmDelete(true); }} disabled={busy} accessibilityRole="button">
  <Text style={styles.deleteSessionLink}>Delete cooking session</Text>
</Pressable>
```

---

## 2. Changes to cooking.styles.ts

### 2.1 Remove or Modify Existing Styles

**Remove:**
- None (all existing styles can coexist or be overridden)

**Modify:**
- `safe.backgroundColor`: change from '#FAFAF7' to '#FFFFFF'
- `scroll.paddingBottom`: change from 40 to 80
- `scroll.gap`: change from 18 to 16

### 2.2 New Style Definitions

Add the following styles to the StyleSheet.create call:

```typescript
// ── Header ────────────────────────────────────────────────────────────
header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 4,
  paddingVertical: 8,
  minHeight: 44,
},

headerButton: {
  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 22,
},

headerTitle: {
  fontSize: 17,
  fontWeight: '600',
  color: '#202536',
  flex: 1,
  textAlign: 'center',
},

// ── Progress Bar ──────────────────────────────────────────────────────
progressBarContainer: {
  height: 4,
  backgroundColor: '#F3E7E8',
  width: '100%',
  overflow: 'hidden',
  marginTop: 8,
},

progressBarFill: {
  height: 4,
  backgroundColor: '#E8505B',
},

stepBadgeContainer: {
  alignItems: 'flex-start',
  marginTop: 12,
  marginBottom: 8,
},

stepBadge: {
  backgroundColor: '#FFF0EF',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 6,
},

stepBadgeText: {
  color: '#E8505B',
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 0.5,
},

// ── Steps Card ────────────────────────────────────────────────────────
stepsCard: {
  gap: 16,
},

instructionCard: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E8E8E3',
  borderRadius: 16,
  padding: 20,
  gap: 12,
},

instructionLabel: {
  color: '#E8505B',
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 0.5,
},

instructionText: {
  color: '#202536',
  fontSize: 22,
  lineHeight: 32,
  fontWeight: '500',
},

voiceControlRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 4,
},

voiceControlLabel: {
  color: '#303746',
  fontSize: 15,
  fontWeight: '500',
},

playAudioButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#E8505B',
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 8,
  minHeight: 36,
},

playAudioButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
},

// ── Timer Card ────────────────────────────────────────────────────────
timerCard: {
  backgroundColor: '#F7F7F5',
  borderRadius: 16,
  padding: 20,
  gap: 16,
  alignItems: 'center',
},

timerCardLabel: {
  color: '#303746',
  fontSize: 15,
  fontWeight: '600',
},

timerDigital: {
  color: '#202536',
  fontSize: 32,
  fontWeight: '700',
  fontVariant: ['tabular-nums'],
},

timerControls: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  width: '100%',
},

timerInput: {
  flex: 1,
  borderWidth: 1,
  borderColor: '#D8DADD',
  borderRadius: 10,
  minHeight: 48,
  padding: 12,
  color: '#202536',
  backgroundColor: '#FFFFFF',
  textAlign: 'center',
},

// ── Mini Player ───────────────────────────────────────────────────────
miniPlayer: {
  backgroundColor: '#2C2C2C',
  borderRadius: 16,
  padding: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
},

miniPlayerContent: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  flex: 1,
},

miniPlayerThumbnail: {
  width: 48,
  height: 48,
  borderRadius: 8,
},

miniPlayerInfo: {
  flex: 1,
  gap: 2,
},

miniPlayerStep: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
},

miniPlayerRecipe: {
  color: '#B0B0B0',
  fontSize: 13,
},

miniPlayerStatus: {
  color: '#E8505B',
  fontSize: 12,
  fontWeight: '500',
  marginTop: 2,
},

miniPlayerControls: {
  flexDirection: 'row',
  gap: 8,
},

miniPlayerButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#404040',
  alignItems: 'center',
  justifyContent: 'center',
},

// ── Bottom Navigation ─────────────────────────────────────────────────
bottomNavigation: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 8,
},

bottomNavPrevious: {
  flex: 1,
},

bottomNavNext: {
  flex: 2,
},

// ── Delete Session Link ───────────────────────────────────────────────
deleteSessionLink: {
  color: '#E8505B',
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
  paddingVertical: 12,
  textDecorationLine: 'underline',
},
```

---

## 3. Risk Areas and Mitigation

### 3.1 Timer Countdown Accuracy
**Risk:** The circular progress calculation and clock updates might drift.
**Mitigation:** Use existing `clock` state and 500ms interval. The `remaining` calculation is already accurate. CircularTimer is purely visual.

### 3.2 Voice State Synchronization
**Risk:** `isSpeaking` and `showVoicePlayer` could get out of sync if Speech.stop() is called externally.
**Mitigation:** Always call stopVoice() helper (not Speech.stop() directly) which resets both states. Add state resets in useFocusEffect cleanup and all navigation handlers.

### 3.3 ScrollView Content Overlap
**Risk:** Mini-player and bottom navigation could overlap on small screens.
**Mitigation:** Set paddingBottom: 80 on scroll container. Mini-player is inside scroll content, not fixed. Test on small viewport (320px width).

### 3.4 Photo Loading States
**Risk:** Existing photo logic is complex with fetchedImageUrl and imageDecoding tracking.
**Mitigation:** Do NOT modify photo logic. Only ensure styles.recipeImageWrapper uses borderRadius: 16. All existing photo states (spinner, placeholder, decode error) remain unchanged.

### 3.5 Session State Changes
**Risk:** Progress bar and step badge might show stale data during saves.
**Mitigation:** Both derive from `session` state which is updated atomically by setSession(). No additional synchronization needed.

### 3.6 CircularTimer Precision
**Risk:** View-based circular indicator is approximate, not pixel-perfect.
**Mitigation:** Acceptable for this requirement. For production, consider react-native-svg with proper arc paths. Document this as a known limitation.

---

## 4. Validation Steps

### 4.1 TypeScript Check
```bash
npx tsc --noEmit
```
**Expected:** No new errors. Baseline is currently clean (verified during exploration).

### 4.2 Lint Check
```bash
npx expo lint src/app/cooking.tsx src/styles/cooking.styles.ts
```
**Expected:** No new errors or warnings in these two files.

### 4.3 Build Verification
```bash
npx expo start
```
**Expected:** Dev server starts without errors. Open on iOS, Android, or web.

### 4.4 Manual Testing Checklist

**Must test (when runtime environment available):**
- [ ] Recipe with 1 step and recipe with 5+ steps
- [ ] Progress bar updates when completing steps
- [ ] Step badge shows correct "STEP X OF Y"
- [ ] Missing image shows placeholder (test with recipe that has no imageUrl)
- [ ] Long instruction text scrolls/wraps correctly
- [ ] Ingredients tab switch (verify voice stops)
- [ ] Play Audio button shows mini-player
- [ ] Mini-player controls: Repeat, Stop, Close
- [ ] Mini-player shows "Speaking..." when active
- [ ] Previous button disabled at step 0
- [ ] Next/Finish button behavior at last step
- [ ] Timer circular indicator shows progress
- [ ] Timer Set button validates input (0-180 minutes)
- [ ] Timer Start/Pause toggle
- [ ] Timer countdown continues across step changes
- [ ] Delete session confirmation flow
- [ ] Small screen (320px width) — verify no overlap
- [ ] Text scaling (accessibility setting)
- [ ] Back and Close buttons in header both navigate away

**Cannot test without device/emulator:**
- Voice synthesis audio output (Speech.speak)
- Touch target size on physical device
- Safe area behavior on iPhone notch/Dynamic Island

### 4.5 Regression Verification

**Must still work (existing functionality):**
- [ ] Recipe loading from recipeId param
- [ ] Start cooking creates session
- [ ] Resume session navigation from ingredients tab
- [ ] completedStepIndexes persists across steps
- [ ] Cooking completion sets status: 'completed'
- [ ] Timer persistence (timerEndAt, timerRemainingSeconds)
- [ ] Error states show errorBox with Reload button
- [ ] Busy states disable buttons
- [ ] Photo fetch for older sessions (fetchRecipeImageUrl)
- [ ] useFocusEffect stops speech on screen blur
- [ ] Generation token prevents stale state updates
- [ ] Lock prevents concurrent saves
- [ ] Version conflict error handling

---

## 5. Files to Modify

1. **c:\Users\ADMIN\Desktop\TasteTrail\src\app\cooking.tsx**
   - Add 2 new state variables
   - Modify 5 functions (readAloud, stopVoice, changeTab, nextStep, useFocusEffect)
   - Add CircularTimer helper component
   - Restructure header JSX
   - Add progress bar and step badge JSX
   - Restructure steps card JSX
   - Restructure timer card JSX
   - Add mini-player JSX
   - Add bottom navigation JSX
   - Modify delete session button to text link

2. **c:\Users\ADMIN\Desktop\TasteTrail\src\styles\cooking.styles.ts**
   - Modify 3 existing styles (safe, scroll, scroll)
   - Add ~40 new style keys organized by section

---

## 6. Implementation Order

1. **Add new styles first** (cooking.styles.ts) — ensures all style references exist before JSX changes
2. **Add CircularTimer component** — standalone helper with no dependencies
3. **Add state variables** — simple declarations
4. **Modify voice functions** — update existing functions to manage new state
5. **Update header** — visual change, no logic
6. **Add progress bar and badge** — pure presentation, derives from session state
7. **Restructure steps card** — removes old voice buttons, adds new layout
8. **Restructure timer card** — uses new CircularTimer component
9. **Add mini-player** — new conditional panel
10. **Add bottom navigation** — moves existing Previous/Next logic
11. **Update delete session** — change button to text link
12. **Run TypeScript check** — verify no type errors
13. **Run lint** — verify code style
14. **Start dev server** — smoke test

---

## 7. Known Limitations

1. **CircularTimer uses View borders, not SVG arcs:** Approximate visualization. For pixel-perfect arcs, add react-native-svg (not done to avoid new dependencies per requirement).

2. **No Pause/Resume for speech:** expo-speech on some platforms does not reliably support pause. Implementation uses Stop instead. If future expo-speech versions add reliable pause, update miniPlayerButton to toggle play/pause.

3. **Voice timing not tracked:** No accurate playback duration or seek bar because expo-speech does not expose real-time playback position. Shows simple "Speaking..." status only.

4. **Manual testing required:** This plan describes what to test, but cannot execute device/emulator tests. Implementer must verify on actual iOS, Android, and web.

5. **Preserves existing photo logic complexity:** The photo loading state machine (fetchedImageUrl, imageDecoding, photoFetchPending) remains unchanged to avoid regression. This is intentional.

---

## Summary

This redesign touches 2 files, adds ~450 lines of code (styles + JSX), and modifies ~200 lines (function bodies, JSX structure). Zero new dependencies. All existing functionality including authentication, recipe loading, session persistence, timer continuity, and voice guidance is preserved. The visual design matches the reference while maintaining mobile-first responsive behavior and accessibility.
