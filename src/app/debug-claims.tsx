import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '@/firebaseConfig';
import { useRouter } from 'expo-router';

/**
 * Debug screen to check Firebase claims
 * Temporary screen for debugging admin claims
 */
export default function DebugClaimsScreen() {
  const [claims, setClaims] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkClaims = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setClaims({ error: 'No user logged in' });
        return;
      }

      // Force refresh the token
      await user.getIdToken(true);
      const idTokenResult = await user.getIdTokenResult();
      
      setClaims({
        user: {
          email: user.email,
          uid: user.uid,
        },
        claims: idTokenResult.claims,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      setClaims({ error: error?.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const manualAdminCheck = () => {
    if (!claims?.claims) return false;
    
    const adminClaim = claims.claims.admin;
    return adminClaim === true || adminClaim === 'true';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Firebase Claims Debug</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={checkClaims}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : 'Check Claims'}
        </Text>
      </TouchableOpacity>

      {claims && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Results:</Text>
          <Text style={styles.claimsText}>
            {JSON.stringify(claims, null, 2)}
          </Text>
          
          {claims.claims && (
            <View style={styles.analysisContainer}>
              <Text style={styles.analysisTitle}>Analysis:</Text>
              <Text style={styles.analysisText}>
                Admin claim: {String(claims.claims.admin)} (type: {typeof claims.claims.admin})
              </Text>
              <Text style={styles.analysisText}>
                Is admin: {String(manualAdminCheck())}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, styles.backButton]}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E8505B',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#E8505B',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#666',
    marginTop: 24,
  },
  buttonText: {
    color: '#FAFAF7',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  claimsText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 5,
  },
  analysisContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 5,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E8505B',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});