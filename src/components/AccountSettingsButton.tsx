import { auth, db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  onProfileUpdated?: () => void | Promise<void>;
}

export default function AccountSettingsButton({ onProfileUpdated }: Props) {
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState<'menu' | 'profile' | 'delete'>('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [slide] = useState(() => new Animated.Value(0));
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(340, width * 0.88);
  const insets = useSafeAreaInsets();

  const close = () => {
    if (busy) return;
    Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setVisible(false);
      setPassword('');
    });
  };

  const open = () => {
    setPage('menu');
    setError('');
    setPassword('');
    slide.setValue(0);
    setVisible(true);
  };

  const editProfile = async () => {
    const user = auth.currentUser;
    if (!user || busy) return;
    setBusy(true);
    setError('');
    try {
      const snapshot = await getDoc(doc(db, 'users', user.uid));
      const profile = snapshot.data();
      setName(profile?.name || user.displayName || '');
      setBio(profile?.bio || '');
      setLocation(profile?.location || '');
      setPage('profile');
    } catch {
      setError('Could not load your profile. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user || busy) return;
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(), bio: bio.trim(), location: location.trim(),
      }, { merge: true });
      await updateProfile(user, { displayName: name.trim() });
      await onProfileUpdated?.();
      setPage('menu');
    } catch {
      setError('Could not save your profile. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await signOut(auth);
      setVisible(false);
      router.replace('/login');
    } catch {
      setError('Could not log out. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    const user = auth.currentUser;
    if (!user?.email || busy) return;
    if (!password) {
      setError('Enter your password to confirm deletion.');
      return;
    }
    setBusy(true);
    setError('');
    let privateDataRemoved = false;
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      // Remove private saved items before deleting the authenticated account.
      const favourites = await getDocs(collection(db, 'users', user.uid, 'favourites'));
      for (let offset = 0; offset < favourites.docs.length; offset += 400) {
        const batch = writeBatch(db);
        favourites.docs.slice(offset, offset + 400).forEach(item => batch.delete(item.ref));
        await batch.commit();
        privateDataRemoved = true;
      }
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid));
      await batch.commit();
      privateDataRemoved = true;
      await deleteUser(user);
      setPassword('');
      setVisible(false);
      router.replace('/login');
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(privateDataRemoved
        ? 'Some profile data was removed, but account deletion did not finish. Please retry to complete deletion.'
        : code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? 'Incorrect password. Please try again.'
        : code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Could not complete account deletion. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.settingsButton} onPress={open}
        accessibilityRole="button" accessibilityLabel="Open account settings" hitSlop={8}>
        <Ionicons name="settings-outline" size={24} color="#333" />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="none" onRequestClose={close}
        onShow={() => Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }).start()}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close}
            accessibilityRole="button" accessibilityLabel="Close account settings" />
          <Animated.View accessibilityViewIsModal style={[styles.panel, {
            width: panelWidth, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20,
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [panelWidth, 0] }) }],
          }]}>
            <View style={styles.headingRow}>
              <Text style={styles.heading}>{page === 'menu' ? 'Account settings' : page === 'profile' ? 'Update profile' : 'Delete account'}</Text>
              <TouchableOpacity onPress={close} disabled={busy} hitSlop={8}
                accessibilityRole="button" accessibilityLabel="Close account settings">
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
                {page === 'menu' ? (
                  <>
                    <TouchableOpacity style={styles.menuItem} onPress={logout} disabled={busy} accessibilityRole="button">
                      <Ionicons name="log-out-outline" size={22} color="#333" /><Text style={styles.menuText}>Log out</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={editProfile} disabled={busy} accessibilityRole="button">
                      <Ionicons name="person-outline" size={22} color="#333" /><Text style={styles.menuText}>Update profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} disabled={busy} accessibilityRole="button"
                      onPress={() => { setError(''); setPassword(''); setPage('delete'); }}>
                      <Ionicons name="trash-outline" size={22} color="#E8505B" /><Text style={[styles.menuText, styles.danger]}>Delete account</Text>
                    </TouchableOpacity>
                  </>
                ) : page === 'profile' ? (
                  <>
                    <Text style={styles.label}>Name</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} editable={!busy} maxLength={100} accessibilityLabel="Name" />
                    <Text style={styles.label}>Bio</Text>
                    <TextInput style={[styles.input, styles.bio]} value={bio} onChangeText={setBio} editable={!busy} multiline maxLength={500} accessibilityLabel="Bio" />
                    <Text style={styles.label}>Location</Text>
                    <TextInput style={styles.input} value={location} onChangeText={setLocation} editable={!busy} maxLength={150} accessibilityLabel="Location" />
                    <TouchableOpacity style={styles.action} onPress={saveProfile} disabled={busy} accessibilityRole="button">
                      <Text style={styles.actionText}>Save changes</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.description}>This permanently deletes your account, profile, and saved favourites. Enter your password, then confirm below.</Text>
                    <Text style={styles.label}>Password</Text>
                    <TextInput style={styles.input} value={password} onChangeText={setPassword} editable={!busy}
                      secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel="Confirm your password" />
                    <TouchableOpacity style={styles.action} onPress={removeAccount} disabled={busy} accessibilityRole="button">
                      <Text style={styles.actionText}>Permanently delete account</Text>
                    </TouchableOpacity>
                  </>
                )}
                {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
                {busy && <ActivityIndicator style={styles.spinner} color="#E8505B" />}
                {page !== 'menu' && (
                  <TouchableOpacity style={styles.back} disabled={busy} accessibilityRole="button"
                    onPress={() => { setPage('menu'); setError(''); setPassword(''); }}>
                    <Text style={styles.backText}>Back to settings</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  settingsButton: { marginRight: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'flex-end' },
  panel: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: 20 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  heading: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  content: { flex: 1 },
  body: { paddingTop: 16, paddingBottom: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuText: { fontSize: 16, color: '#333' },
  danger: { color: '#E8505B' },
  label: { fontSize: 14, color: '#333', fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, fontSize: 16, color: '#1A1A1A', backgroundColor: '#FAFAF7' },
  bio: { minHeight: 90, textAlignVertical: 'top' },
  action: { backgroundColor: '#E8505B', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 24 },
  actionText: { color: '#FFF', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  description: { color: '#666', fontSize: 15, lineHeight: 23 },
  error: { color: '#C62828', fontSize: 14, lineHeight: 21, marginTop: 16 },
  spinner: { marginTop: 16 },
  back: { padding: 14, alignItems: 'center', marginTop: 12 },
  backText: { color: '#666', fontSize: 14 },
});
