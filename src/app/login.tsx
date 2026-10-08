import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth } from '../firebaseConfig';
import Svg, { Path } from 'react-native-svg';

const REMEMBERED_EMAIL_KEY = 'tastetrail.rememberedEmail';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    let mounted = true;

    const restoreRememberedEmail = async () => {
      try {
        const rememberedEmail = await SecureStore.getItemAsync(REMEMBERED_EMAIL_KEY);
        if (mounted && rememberedEmail) {
          setEmail(rememberedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Unable to restore remembered email', error);
      }
    };

    void restoreRememberedEmail();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      try {
        if (rememberMe) {
          await SecureStore.setItemAsync(REMEMBERED_EMAIL_KEY, email.trim());
        } else {
          await SecureStore.deleteItemAsync(REMEMBERED_EMAIL_KEY);
        }
      } catch (error) {
        console.error('Unable to save remember me preference', error);
        Alert.alert('Login successful', 'Your remember me preference could not be saved.');
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred during login';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') errorMessage = 'Incorrect email or password';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Please enter a valid email address';
      else if (error.code === 'auth/user-disabled') errorMessage = 'This account has been disabled';
      else if (error.code === 'auth/network-request-failed') errorMessage = 'Network error. Please check your connection';
      else if (error.code === 'auth/too-many-requests') errorMessage = 'Too many failed attempts. Please try again later';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleRememberMe = async () => {
    const nextValue = !rememberMe;
    setRememberMe(nextValue);
    if (!nextValue) {
      try {
        await SecureStore.deleteItemAsync(REMEMBERED_EMAIL_KEY);
      } catch (error) {
        console.error('Unable to clear remembered email', error);
        Alert.alert('Remember me', 'Unable to clear the remembered email. Please try again.');
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Ionicons name="restaurant-outline" size={42} color="#E8505B" /></View>
          <View style={styles.brandDots}><View style={styles.activeDot} /><View style={styles.inactiveDot} /></View>
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to your account to continue.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="#A4A6AA" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput style={styles.passwordInput} placeholder="Enter your password" placeholderTextColor="#A4A6AA" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!loading} />
            <Ionicons name="eye-outline" size={20} color="#8D929B" />
          </View>
        </View>

        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.remember} onPress={toggleRememberMe} disabled={loading} accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={12} color="#FFF" />}
            </View>
            <Text style={styles.optionText}>Remember me</Text>
          </TouchableOpacity>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </View>
        <Divider />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FAFAF7" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
        <SocialButtons />
        <View style={styles.linkContainer}><Text style={styles.linkText}>Don&apos;t have an account? </Text><TouchableOpacity onPress={() => router.replace('/signup')} disabled={loading}><Text style={styles.link}>Sign Up</Text></TouchableOpacity></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Divider() {
  return <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>Or</Text><View style={styles.dividerLine} /></View>;
}

function SocialButtons() {
  return <View style={styles.socialRow}><View style={styles.socialButton}><GoogleIcon /></View><View style={styles.socialButton}><Ionicons name="logo-apple" size={21} color="#000" /></View><View style={styles.socialButton}><Ionicons name="logo-facebook" size={21} color="#1877F2" /></View></View>;
}

function GoogleIcon() {
  return <Svg width={20} height={20} viewBox="0 0 24 24"><Path fill="#4285F4" d="M21.35 10.1h-9.18v3.73h5.27c-.23 1.2-.93 2.22-1.98 2.91v2.41h3.2c1.87-1.72 2.95-4.25 2.95-7.25 0-.69-.09-1.36-.26-2z" /><Path fill="#34A853" d="M12.17 21.5c2.67 0 4.91-.88 6.55-2.36l-3.2-2.41c-.88.59-2.01.94-3.35.94-2.58 0-4.77-1.74-5.56-4.08H3.3v2.49c1.64 3.22 5 5.42 8.87 5.42z" /><Path fill="#FBBC05" d="M6.61 13.59a5.66 5.66 0 0 1 0-3.18V7.92H3.3a9.86 9.86 0 0 0 0 8.16l3.31-2.49z" /><Path fill="#EA4335" d="M12.17 6.33c1.46 0 2.77.5 3.8 1.49l2.85-2.85C17.07 3.39 14.84 2.5 12.17 2.5 8.3 2.5 4.94 4.7 3.3 7.92l3.31 2.49c.79-2.34 2.98-4.08 5.56-4.08z" /></Svg>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F6' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 },
  brand: { alignItems: 'center', marginBottom: 38 },
  brandIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCECEF', borderWidth: 1, borderColor: '#F5B5BB' },
  brandDots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  activeDot: { width: 20, height: 6, borderRadius: 3, backgroundColor: '#E8505B' },
  inactiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D8D8D8' },
  title: { color: '#1F2937', fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#8791A2', fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 36 },
  field: { marginBottom: 16 },
  label: { color: '#1F2937', fontSize: 13, fontWeight: '500', marginLeft: 4, marginBottom: 6 },
  input: { height: 52, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E9ECF2', paddingHorizontal: 16, color: '#1F2937', fontSize: 14 },
  passwordWrap: { height: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E9ECF2', paddingLeft: 16, paddingRight: 14 },
  passwordInput: { flex: 1, color: '#1F2937', fontSize: 14 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 1 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 8 }, checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#D5D8DE', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: '#E8505B', borderColor: '#E8505B' },
  optionText: { color: '#777B82', fontSize: 12 }, forgot: { color: '#44474D', fontSize: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 16 }, dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E5E5' }, dividerText: { color: '#9A9DA3', fontSize: 12 },
  button: { height: 52, borderRadius: 26, backgroundColor: '#E8505B', alignItems: 'center', justifyContent: 'center', shadowColor: '#E8505B', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 5 },
  buttonDisabled: { opacity: 0.6 }, buttonText: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 24 }, socialButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }, google: { color: '#4285F4', fontSize: 23, fontWeight: '700' },
  linkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 }, linkText: { color: '#A0A0A0', fontSize: 12 }, link: { color: '#E8505B', fontSize: 12, fontWeight: '700' },
});
