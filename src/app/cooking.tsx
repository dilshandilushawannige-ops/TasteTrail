import { auth } from '@/firebaseConfig';
import { cookingStyles as styles } from '@/styles/cooking.styles';
import { deleteCooking, fetchRecipeImageUrl, loadCooking, startCooking, updateCooking } from '@/services/cookingSessions';
import type { CookingRecipe, CookingSession, SessionChanges } from '@/services/cookingSessions';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function CircularTimer({ remaining, total }: { remaining: number; total: number }) {
  const size = 120;
  const strokeWidth = 8;
  const progress = total > 0 ? remaining / total : 0;

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

function Button({ title, onPress, disabled = false, secondary = false }: {
  title: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

export default function CookingScreen() {
  const params = useLocalSearchParams<{ recipeId?: string | string[] }>();
  const recipeId = Array.isArray(params.recipeId) ? params.recipeId[0] : params.recipeId;
  // Reset local UI when a different recipe is opened in the same route.
  return <CookingContent key={recipeId ?? 'missing'} recipeId={recipeId} />;
}

function CookingContent({ recipeId }: { recipeId?: string }) {
  const [recipe, setRecipe] = useState<CookingRecipe | null>(null);
  const [session, setSession] = useState<CookingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [retry, setRetry] = useState(0);
  const [minutes, setMinutes] = useState('5');
  const [clock, setClock] = useState(() => Date.now());
  const [showVoicePlayer, setShowVoicePlayer] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);

  // ── Recipe photo state ────────────────────────────────────────────────────
  // imageUrl is kept separately from the recipe object so we can patch in a
  // photo that was missing from an older saved session without touching the
  // session's cooking instructions or progress.
  //
  // fetchedImageUrl:
  //   undefined = fetch not yet attempted (or reset after recipe switch)
  //   null      = fetch completed, no photo available
  //   string    = fetch completed, photo URL retrieved
  // Only ever set from async .then()/.catch() to satisfy set-state-in-effect.
  const [fetchedImageUrl, setFetchedImageUrl] = useState<string | null | undefined>(undefined);
  // imageDecoding tracks the expo-image decode state for the URL we actually show.
  const [imageDecoding, setImageDecoding] = useState<'idle' | 'loading' | 'error'>('idle');
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const lifecycle = generation;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const token = ++lifecycle.current;
      setLoading(true);
      setRecipe(null);
      setSession(null);
      setError('');
      setConfirmDelete(false);
      setTab('ingredients');
      // Reset photo state whenever we switch recipes or re-auth.
      setFetchedImageUrl(undefined);
      setImageDecoding('idle');
      if (!user || !recipeId || recipeId.includes('/')) {
        setError(!user ? 'Sign in to start cooking.' : 'Open a recipe from the Home screen.');
        setLoading(false);
        return;
      }
      loadCooking(user.uid, recipeId).then((result) => {
        if (token !== lifecycle.current) return;
        setRecipe(result.recipe);
        setSession(result.session);
        setLoading(false);
      }).catch((failure: unknown) => {
        if (token !== lifecycle.current) return;
        setError(message(failure));
        setLoading(false);
      });
    });
    return () => { lifecycle.current++; unsubscribe(); };
  }, [recipeId, retry]);

  // ── Photo side-effect ─────────────────────────────────────────────────────
  // Only fires for older sessions where the recipe snapshot has no imageUrl.
  // Attempts one optional Firestore read; any failure is silently swallowed.
  // setFetchedImageUrl is only called from the async .then()/.catch() callbacks
  // (never synchronously in the effect body) to satisfy set-state-in-effect.
  useEffect(() => {
    // If the recipe snapshot already has a URL, nothing to fetch.
    if (!recipe || recipe.imageUrl || !recipeId) return;

    fetchRecipeImageUrl(recipeId).then((url) => {
      setFetchedImageUrl(url ?? null);
    }).catch(() => {
      setFetchedImageUrl(null); // non-fatal; placeholder will show
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id, recipeId]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Derived photo URL ─────────────────────────────────────────────────────
  // Computed inline on every render from recipe state — no extra useEffect.
  //   recipe.imageUrl   → direct URL from the recipe/session snapshot (new recipes)
  //   fetchedImageUrl   → optional Firestore lookup result for older sessions
  //   undefined/null    → no photo available; placeholder shown
  const displayImageUrl: string | undefined =
    recipe?.imageUrl ??
    (typeof fetchedImageUrl === 'string' ? fetchedImageUrl : undefined);

  // photoFetchPending: true while awaiting the optional Firestore lookup.
  const photoFetchPending =
    !!recipe && !recipe.imageUrl && !!recipeId && fetchedImageUrl === undefined;
  // ─────────────────────────────────────────────────────────────────────────

  useFocusEffect(useCallback(() => {
    return () => { 
      void Speech.stop().catch(() => undefined);
      setShowVoicePlayer(false);
      setIsSpeaking(false);
    };
  }, []));

  useEffect(() => {
    if (!session?.timerEndAt) return;
    const interval = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(interval);
  }, [session?.timerEndAt]);

  async function run(action: (uid: string, token: number) => Promise<void>) {
    if (lock.current) return;
    const user = auth.currentUser;
    if (!user) { setError('Please sign in again.'); return; }
    const token = generation.current;
    lock.current = true;
    setBusy(true);
    setError('');
    try { await action(user.uid, token); }
    catch (failure) { if (token === generation.current) setError(message(failure)); }
    finally { lock.current = false; if (token === generation.current) setBusy(false); }
  }

  async function save(changes: SessionChanges) {
    if (!session) return;
    await run(async (uid, token) => {
      const updated = await updateCooking(uid, session, changes);
      if (token === generation.current) { setSession(updated); setClock(Date.now()); }
    });
  }

  async function begin() {
    if (!recipe) return;
    await run(async (uid, token) => {
      const saved = await startCooking(uid, recipe);
      if (token !== generation.current) return;
      setRecipe(saved.recipe);
      setSession(saved);
      setTab('steps');
    });
  }

  function stopVoice() { 
    void Speech.stop().catch((failure: any) => setError(message(failure)));
    setIsSpeaking(false);
    setShowVoicePlayer(false);
  }

  async function readAloud() {
    if (!recipe) return;
    const spoken = tab === 'ingredients'
      ? `Ingredients for ${recipe.name}. ${recipe.ingredients}`
      : session ? `Step ${session.currentStepIndex + 1}. ${session.recipe.steps[session.currentStepIndex]}` : '';
    if (!spoken.trim()) return;
    if (spoken.length > Speech.maxSpeechInputLength) {
      setError('This text is too long for one voice reading. Shorten it or split the recipe into smaller steps.');
      return;
    }
    setError('');
    try {
      await Speech.stop();
      setShowVoicePlayer(true);
      setIsSpeaking(true);
      Speech.speak(spoken, { 
        language: 'en-US', 
        rate: 0.85,
        onError: () => {
          setError('Voice playback failed. Check device voices and volume, then try again.');
          setIsSpeaking(false);
        },
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    } catch (failure) { 
      setError(message(failure));
      setIsSpeaking(false);
    }
  }

  function changeTab(next: 'ingredients' | 'steps') { 
    stopVoice(); 
    setTab(next); 
  }

  async function nextStep() {
    if (!session) return;
    stopVoice();
    const index = session.currentStepIndex;
    const completed = [...new Set([...session.completedStepIndexes, index])];
    if (index === session.recipe.steps.length - 1) {
      await save({ completedStepIndexes: completed, status: 'completed', timerEndAt: null, timerRemainingSeconds: 0 });
    } else {
      await save({ currentStepIndex: index + 1, completedStepIndexes: completed });
    }
  }

  const remaining = session?.timerEndAt
    ? Math.max(0, Math.ceil((session.timerEndAt - clock) / 1000))
    : session?.timerRemainingSeconds ?? 300;
  const timeLabel = `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`;

  function setTimer() {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0 || value > 180) {
      setError('Enter a timer duration between 0 and 180 minutes, greater than zero.'); return;
    }
    void save({ timerEndAt: null, timerRemainingSeconds: Math.max(1, Math.round(value * 60)) });
  }

  function leave() {
    stopVoice();
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
  }

  const blocked = busy || loading || !!error;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={leave} disabled={busy} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color="#202536" />
          </Pressable>
          <Text style={styles.headerTitle}>Cooking Mode</Text>
          <Pressable onPress={leave} disabled={busy} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Close cooking mode">
            <Ionicons name="close" size={24} color="#202536" />
          </Pressable>
        </View>

        {session && (
          <>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { 
                width: `${Math.round((session.completedStepIndexes.length / recipe!.steps.length) * 100)}%` 
              }]} />
            </View>
            <View style={styles.stepBadgeContainer}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  STEP {session.currentStepIndex + 1} OF {recipe!.steps.length}
                </Text>
              </View>
            </View>
          </>
        )}

        {loading && <ActivityIndicator size="large" color="#E8505B" />}
        {!!error && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.error}>{error}</Text>
            <Button title="Reload recipe and saved progress" secondary disabled={busy}
              onPress={() => { stopVoice(); setRetry((value) => value + 1); }} />
          </View>
        )}

        {recipe && <>
          <Text style={styles.title}>{recipe.name}</Text>

          {/* ── Recipe photo ──────────────────────────────────────────────── */}
          <View style={styles.recipeImageWrapper}
            accessibilityRole="image"
            accessibilityLabel={displayImageUrl ? `Photo of ${recipe.name}` : 'Recipe photo unavailable'}>
            {/* The actual image — rendered when we have a URL and no decode error */}
            {displayImageUrl && imageDecoding !== 'error' ? (
              <Image
                source={{ uri: displayImageUrl }}
                style={styles.recipeImage}
                contentFit="cover"
                transition={250}
                onLoadStart={() => setImageDecoding('loading')}
                onLoadEnd={() => setImageDecoding('idle')}
                onError={() => setImageDecoding('error')}
                accessibilityLabel={`Photo of ${recipe.name}`}
              />
            ) : null}
            {/* Spinner — while Firestore optional fetch is pending or image is decoding */}
            {(photoFetchPending || imageDecoding === 'loading') && (
              <View style={[styles.recipeImagePlaceholder, { position: 'absolute', inset: 0 } as object]}>
                <ActivityIndicator size="small" color="#E8505B" />
              </View>
            )}
            {/* Neutral placeholder — no URL, broken URL, or decode error */}
            {!displayImageUrl && !photoFetchPending && (
              <View style={styles.recipeImagePlaceholder}>
                <Ionicons name="restaurant-outline" size={44} color="#E8505B" style={styles.recipeImagePlaceholderIcon} />
                <Text style={styles.recipeImagePlaceholderText}>Recipe photo unavailable</Text>
              </View>
            )}
            {displayImageUrl && imageDecoding === 'error' && (
              <View style={styles.recipeImagePlaceholder}>
                <Ionicons name="restaurant-outline" size={44} color="#E8505B" style={styles.recipeImagePlaceholderIcon} />
                <Text style={styles.recipeImagePlaceholderText}>Recipe photo unavailable</Text>
              </View>
            )}
          </View>
          {/* ─────────────────────────────────────────────────────────────── */}

          <Text style={styles.muted}>
            {session ? 'Saved session loaded. Each step change is saved before moving on.' : 'Review the ingredients, then start your cooking session.'}
          </Text>
          <View style={styles.tabs}>
            {(['ingredients', 'steps'] as const).map((value) => (
              <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }}
                onPress={() => changeTab(value)} disabled={busy}
                style={[styles.tab, tab === value && styles.tabActive]}>
                <Text style={styles.tabText}>{value === 'ingredients' ? 'Ingredients' : 'Cooking steps'}</Text>
              </Pressable>
            ))}
          </View>

          {session?.status === 'completed' && (
            <View style={styles.card}>
              <Text style={styles.success}>Cooking completed!</Text>
              <Text style={styles.muted}>Your completed session is saved. Delete this session below if you want to cook it again from the beginning.</Text>
            </View>
          )}

          {tab === 'ingredients' ? (
            <View style={styles.card}>
              <Text style={styles.heading}>Ingredients</Text>
              <Text style={styles.text}>{recipe.ingredients || 'No ingredient list was provided.'}</Text>
              <View style={styles.row}>
                <Button title="Read ingredients aloud" secondary onPress={readAloud} disabled={busy || !recipe.ingredients} />
                <Button title="Stop voice" secondary onPress={stopVoice} />
              </View>
              {session?.status !== 'completed' && <Button disabled={blocked}
                title={busy ? 'Saving…' : session ? `Resume step ${session.currentStepIndex + 1}` : 'Start cooking'}
                onPress={() => { if (session) changeTab('steps'); else void begin(); }} />}
            </View>
          ) : !session ? (
            <View style={styles.card}>
              <Text style={styles.heading}>{recipe.steps.length} cooking steps</Text>
              <Text style={styles.muted}>Start a session to follow the instructions and save your progress.</Text>
              <Button title="Start cooking" onPress={() => void begin()} disabled={blocked} />
            </View>
          ) : (
            <View style={styles.stepsCard}>
              <View style={styles.instructionCard}>
                <Text style={styles.instructionLabel}>
                  STEP {session.currentStepIndex + 1} OF {recipe.steps.length}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${session.completedStepIndexes.length / recipe.steps.length * 100}%` }]} />
                </View>
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
          )}

          {session?.status === 'in_progress' && (
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
              <Text style={styles.muted}>Time is restored when you return. This version does not send background alarms or notifications.</Text>
            </View>
          )}

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
                <Pressable onPress={() => { stopVoice(); }} style={styles.miniPlayerButton} accessibilityRole="button" accessibilityLabel="Close player">
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {session?.status === 'in_progress' && (
            <View style={styles.bottomNavigation}>
              <View style={styles.bottomNavPrevious}>
                <Button
                  title="Previous"
                  secondary
                  disabled={blocked || session.currentStepIndex === 0}
                  onPress={() => {
                    stopVoice();
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

          {session && <View style={styles.card}>
            {!confirmDelete ? (
              <Pressable onPress={() => { stopVoice(); setConfirmDelete(true); }} disabled={busy} accessibilityRole="button">
                <Text style={styles.deleteSessionLink}>Delete cooking session</Text>
              </Pressable>
            ) : <>
              <Text style={styles.danger}>Delete saved progress and timer for this recipe?</Text>
              <Text style={styles.muted}>The recipe and your bookmark will remain.</Text>
              <View style={styles.row}>
                <Button title="Yes, delete session" disabled={busy} onPress={() => void run(async (uid, token) => {
                  await deleteCooking(uid, recipe.id);
                  if (token !== generation.current) return;
                  setSession(null); setConfirmDelete(false); setTab('ingredients');
                })} />
                <Button title="Cancel" secondary disabled={busy} onPress={() => setConfirmDelete(false)} />
              </View>
            </>}
          </View>}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
