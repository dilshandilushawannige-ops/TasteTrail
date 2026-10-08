import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CLOUDINARY_CONFIG } from '@/config/cloudinary';
import { auth, db } from '@/firebaseConfig';

interface AdminProfile {
  name: string;
  email: string;
  role: string;
  joinedAt?: any;
}

/**
 * Admin Profile screen
 * Modern profile UI with comprehensive admin settings and account management
 */
export default function AdminProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
  // Editable fields
  const [editName, setEditName] = useState('');
  
  const router = useRouter();
  const user = auth.currentUser;

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as AdminProfile;
        setProfile(data);
        setEditName(data.name || '');
      }
      setPhotoUrl(user.photoURL);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleUploadPhoto = async () => {
    if (!user || uploadingPhoto) return;

    setUploadingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;
      const image = result.assets[0];
      if (!image.base64) throw new Error('Could not read the selected photo');

      const response = await fetch(
        CLOUDINARY_CONFIG.uploadUrl(CLOUDINARY_CONFIG.cloudName),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: `data:image/jpeg;base64,${image.base64}`,
            upload_preset: CLOUDINARY_CONFIG.uploadPreset,
            folder: 'admin-profile-photos',
          }),
        }
      );
      const uploaded = await response.json();
      if (!response.ok || !uploaded.secure_url) {
        throw new Error(uploaded.error?.message || 'Photo upload failed');
      }

      await updateProfile(user, { photoURL: uploaded.secure_url });
      setPhotoUrl(uploaded.secure_url);
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      Alert.alert('Upload failed', 'Could not save your profile photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editName,
      });

      setProfile({
        ...profile!,
        name: editName,
      });

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(profile?.name || '');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out of the admin console?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await signOut(auth);
              // Navigation will be handled automatically by _layout.tsx
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatJoinDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8505B" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#E8505B" />
        <Text style={styles.errorText}>Unable to load profile</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#E8505B" />
              <Text style={styles.adminText}>ADMIN CONSOLE</Text>
            </View>
            <Text style={styles.pageTitle}>Profile</Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={48} color="#E8505B" />
                )}
              </View>
              <TouchableOpacity
                style={styles.uploadBadge}
                onPress={handleUploadPhoto}
                disabled={uploadingPhoto}
                accessibilityLabel="Change profile photo"
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="camera" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
              <View style={styles.onlineBadge} />
            </View>

            {/* Name and Role */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#E8505B" />
                <Text style={styles.roleText}>{profile.role || 'Admin'}</Text>
              </View>
              <Text style={styles.joinedText}>
                Member since {formatJoinDate(profile.joinedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            {!isEditing && (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.editIconButton}
              >
                <Ionicons name="create-outline" size={20} color="#E8505B" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoCard}>
            {/* Name */}
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={18} color="#666" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter your name"
                    placeholderTextColor="#999"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profile.name}</Text>
                )}
              </View>
            </View>

            {/* Email */}
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={18} color="#666" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
            </View>

            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={styles.dangerCard}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loading}
            >
              <View style={styles.logoutIcon}>
                <Ionicons name="log-out-outline" size={20} color="#E8505B" />
              </View>
              <View style={styles.logoutContent}>
                <Text style={styles.logoutText}>Logout</Text>
                <Text style={styles.logoutSubtext}>
                  Sign out of admin console
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#E8505B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>TasteTrail Admin v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2024 All rights reserved</Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8505B',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E8505B',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
  },
  uploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8505B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  onlineBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 6,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8505B',
  },
  joinedText: {
    fontSize: 12,
    color: '#999',
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  editIconButton: {
    padding: 4,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  infoInput: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#E8505B',
    paddingVertical: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E8505B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Danger Card
  dangerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE5E7',
    overflow: 'hidden',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutContent: {
    flex: 1,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E8505B',
    marginBottom: 2,
  },
  logoutSubtext: {
    fontSize: 12,
    color: '#999',
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 11,
    color: '#BBB',
  },

  bottomSpacing: {
    height: 20,
  },
});