import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import Svg, { Path } from 'react-native-svg';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) { Alert.alert('Missing Information', 'Please fill in all fields'); return; }
    if (password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), { uid: user.uid, name: name.trim(), email: email.trim().toLowerCase(), createdAt: serverTimestamp() });
    } catch (error: any) {
      let errorMessage = 'An error occurred during signup';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'This email is already registered';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Please enter a valid email address';
      else if (error.code === 'auth/weak-password') errorMessage = 'Password is too weak';
      else if (error.code === 'auth/network-request-failed') errorMessage = 'Network error. Please check your connection';
      Alert.alert('Signup Failed', errorMessage);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.avatar}>
          <View style={styles.avatarHead} />
          <View style={styles.shoulders} />
          <View style={styles.plus}><Ionicons name="add" size={17} color="#FFF" /></View>
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started with your dashboard.</Text>
        <Field label="Full Name" placeholder="Enter your name" value={name} onChangeText={setName} autoCapitalize="words" editable={!loading} />
        <Field label="Email" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading} />
        <Field label="Password" placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Create Account</Text>}</TouchableOpacity>
        <Divider />
        <SocialButtons />
        <View style={styles.linkContainer}><Text style={styles.linkText}>Already have an account? </Text><TouchableOpacity onPress={() => router.replace('/login')} disabled={loading}><Text style={styles.link}>Sign In</Text></TouchableOpacity></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholderTextColor="#91A0B7" /></View>;
}
function Divider() { return <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>Or</Text><View style={styles.dividerLine} /></View>; }
function SocialButtons() { return <View style={styles.socialRow}><View style={styles.socialButton}><GoogleIcon /></View><View style={styles.socialButton}><Ionicons name="logo-apple" size={21} color="#000" /></View><View style={styles.socialButton}><Ionicons name="logo-facebook" size={21} color="#1877F2" /></View></View>; }
function GoogleIcon() { return <Svg width={20} height={20} viewBox="0 0 24 24"><Path fill="#4285F4" d="M21.35 10.1h-9.18v3.73h5.27c-.23 1.2-.93 2.22-1.98 2.91v2.41h3.2c1.87-1.72 2.95-4.25 2.95-7.25 0-.69-.09-1.36-.26-2z" /><Path fill="#34A853" d="M12.17 21.5c2.67 0 4.91-.88 6.55-2.36l-3.2-2.41c-.88.59-2.01.94-3.35.94-2.58 0-4.77-1.74-5.56-4.08H3.3v2.49c1.64 3.22 5 5.42 8.87 5.42z" /><Path fill="#FBBC05" d="M6.61 13.59a5.66 5.66 0 0 1 0-3.18V7.92H3.3a9.86 9.86 0 0 0 0 8.16l3.31-2.49z" /><Path fill="#EA4335" d="M12.17 6.33c1.46 0 2.77.5 3.8 1.49l2.85-2.85C17.07 3.39 14.84 2.5 12.17 2.5 8.3 2.5 4.94 4.7 3.3 7.92l3.31 2.49c.79-2.34 2.98-4.08 5.56-4.08z" /></Svg>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F6' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FCECEF', borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'center', marginBottom: 25, overflow: 'visible' },
  avatarHead: { width: 29, height: 29, borderRadius: 15, backgroundColor: '#1F2937', marginBottom: 4, zIndex: 1 },
  shoulders: { width: 58, height: 34, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#E8505B' }, plus: { position: 'absolute', top: -4, right: -3, width: 25, height: 25, borderRadius: 13, backgroundColor: '#E8505B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  title: { color: '#1F2937', fontSize: 26, fontWeight: '700', textAlign: 'center' }, subtitle: { color: '#687892', fontSize: 14, textAlign: 'center', marginTop: 7, marginBottom: 27 },
  field: { marginBottom: 16 }, label: { color: '#1F2937', fontSize: 13, fontWeight: '500', marginLeft: 4, marginBottom: 6 }, input: { height: 52, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E9ECF2', paddingHorizontal: 16, color: '#1F2937', fontSize: 14 },
  button: { height: 52, borderRadius: 26, backgroundColor: '#E8505B', alignItems: 'center', justifyContent: 'center', marginTop: 7, shadowColor: '#E8505B', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 5 }, buttonDisabled: { opacity: 0.6 }, buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 16 }, dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E5E5' }, dividerText: { color: '#9A9DA3', fontSize: 12 }, socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 }, socialButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  linkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 }, linkText: { color: '#77808E', fontSize: 12 }, link: { color: '#E8505B', fontSize: 12, fontWeight: '700' },
});
