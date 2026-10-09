import { auth, db } from '@/firebaseConfig';
import { blockExpiry } from '@/services/userBlockService';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// The account document remains readable during a block so the expiry can be shown.
export default function AccountBlockGate({ children }: PropsWithChildren) {
  const [expiry, setExpiry] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let generation = 0;
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      const active = ++generation;
      unsubscribeProfile?.();
      setExpiry(null); setError(''); setChecking(!!user);
      if (!user) return;
      unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), snapshot => {
        if (generation !== active) return;
        setExpiry(blockExpiry(snapshot.data() || {}));
        setNow(Date.now()); setChecking(false);
      }, () => {
        if (generation !== active) return;
        setError('Could not check account access. Check your connection and retry.'); setChecking(false);
      });
    });
    return () => { generation++; unsubscribeAuth(); unsubscribeProfile?.(); };
  }, [retry]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  if (checking) return <View style={styles.screen}><ActivityIndicator color="#E8505B" /></View>;
  if (error) return <View style={styles.screen}>
    <Text style={styles.message} accessibilityRole="alert">{error}</Text>
    <TouchableOpacity style={styles.button} onPress={() => { setChecking(true); setRetry(value => value + 1); }}><Text style={styles.buttonText}>Retry</Text></TouchableOpacity>
  </View>;
  if (expiry && expiry > now) return <View style={styles.screen}>
    <Text style={styles.title}>Account temporarily blocked</Text>
    <Text style={styles.message}>Your access resumes on {new Date(expiry).toLocaleString(undefined, { timeZone: 'Asia/Colombo' })} (Sri Lanka time).</Text>
    <TouchableOpacity style={styles.button} accessibilityRole="button" onPress={() => signOut(auth).catch(() => setError('Could not sign out. Please retry.'))}><Text style={styles.buttonText}>Sign out</Text></TouchableOpacity>
  </View>;
  return children;
}
const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FAFAF7', gap: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#E8505B', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 23, color: '#666', textAlign: 'center' },
  button: { backgroundColor: '#E8505B', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: '#FFF', fontWeight: '600' },
});
