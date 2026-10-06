import { auth } from '@/firebaseConfig';
import { cookingStyles as styles } from '@/styles/cooking.styles';
import { deleteCooking, loadCooking, startCooking, updateCooking } from '@/services/cookingSessions';
import type { CookingRecipe, CookingSession, SessionChanges } from '@/services/cookingSessions';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
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
  const lock = useRef(false);
  const generation = useRef(0);

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

  useFocusEffect(useCallback(() => {
    return () => { void Speech.stop().catch(() => undefined); };
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

  function stopVoice() { void Speech.stop().catch((failure: any) => setError(message(failure))); }

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
      Speech.speak(spoken, { language: 'en-US', rate: 0.85,
        onError: () => setError('Voice playback failed. Check device voices and volume, then try again.'),
      });
    } catch (failure) { setError(message(failure)); }
  }

  function changeTab(next: 'ingredients' | 'steps') { stopVoice(); setTab(next); }

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
        <View style={[styles.row, styles.between]}>
          <Button title="Back" onPress={leave} disabled={busy} secondary />
          <Text style={styles.label}>COOKING MODE</Text>
        </View>

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
            <View style={styles.card}>
              <Text style={styles.label}>STEP {session.currentStepIndex + 1} OF {recipe.steps.length}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${session.completedStepIndexes.length / recipe.steps.length * 100}%` }]} />
              </View>
              <Text style={styles.muted}>{session.completedStepIndexes.length} of {recipe.steps.length} steps completed</Text>
              <Text style={styles.instruction}>{recipe.steps[session.currentStepIndex]}</Text>
              <View style={styles.row}>
                <Button title="Read step aloud" onPress={readAloud} secondary disabled={busy} />
                <Button title="Stop voice" onPress={stopVoice} secondary />
              </View>
              {session.status !== 'completed' && <View style={styles.row}>
                <View style={styles.flex}><Button title="Previous" secondary
                  disabled={blocked || session.currentStepIndex === 0}
                  onPress={() => { stopVoice(); void save({ currentStepIndex: session.currentStepIndex - 1 }); }} /></View>
                <View style={styles.flex}><Button disabled={blocked}
                  title={busy ? 'Saving…' : session.currentStepIndex === recipe.steps.length - 1 ? 'Finish cooking' : 'Next step'}
                  onPress={() => void nextStep()} /></View>
              </View>}
            </View>
          )}

          {session?.status === 'in_progress' && (
            <View style={styles.card}>
              <Text style={styles.heading}>Your cooking timer</Text>
              <Text style={styles.muted}>Set your own duration. This timer continues across steps and is separate from recipe instructions.</Text>
              <Text style={styles.timer}>{timeLabel}</Text>
              {remaining === 0 && <Text style={styles.success} accessibilityLiveRegion="polite">Timer finished</Text>}
              <View style={styles.row}>
                <TextInput style={styles.input} value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad"
                  accessibilityLabel="Timer duration in minutes" editable={!busy} maxLength={6} />
                <Text style={styles.muted}>minutes</Text>
                <Button title="Set / reset" onPress={setTimer} secondary disabled={blocked} />
              </View>
              <Button disabled={blocked || remaining === 0}
                title={session.timerEndAt ? 'Pause timer' : 'Start timer'}
                onPress={() => {
                  if (session.timerEndAt) {
                    void save({ timerEndAt: null, timerRemainingSeconds: Math.max(0, Math.ceil((session.timerEndAt - Date.now()) / 1000)) });
                  } else { void save({ timerEndAt: Date.now() + remaining * 1000 }); }
                }} />
              <Text style={styles.muted}>Time is restored when you return. This version does not send background alarms or notifications.</Text>
            </View>
          )}

          {session && <View style={styles.card}>
            {!confirmDelete ? (
              <Button title="Delete cooking session" secondary disabled={busy}
                onPress={() => { stopVoice(); setConfirmDelete(true); }} />
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
