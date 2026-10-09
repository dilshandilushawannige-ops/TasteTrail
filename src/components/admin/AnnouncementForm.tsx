import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { announcementError, createAnnouncementId, publishAnnouncement, updateAnnouncement, type Announcement } from '@/services/announcementService';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props { visible: boolean; onClose: () => void; initialAnnouncement?: Announcement; onSaved?: () => void; }
const TITLE_LIMIT = 80;
const MESSAGE_LIMIT = 1000;

export default function AnnouncementForm({ visible, onClose, initialAnnouncement, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initialAnnouncement?.title || '');
  const [message, setMessage] = useState(initialAnnouncement?.message || '');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const sendingRef = useRef(false);
  const requestId = useRef<string | null>(null);
  const close = () => { if (sendingRef.current) return; setPreview(false); setError(''); setSent(false); onClose(); };
  const previewAnnouncement = () => {
    if (!title.trim() || !message.trim()) {
      setError('Enter an announcement title and message.'); return;
    }
    setError(''); setPreview(true);
  };
  const send = async () => {
    if (sendingRef.current || sent) return;
    sendingRef.current = true; setSending(true); setError('');
    try {
      if (initialAnnouncement) await updateAnnouncement(initialAnnouncement.id, title, message);
      else {
        requestId.current ??= createAnnouncementId();
        await publishAnnouncement(requestId.current, title, message);
      }
      setSent(true); setTitle(''); setMessage(''); setPreview(false); requestId.current = null;
      onSaved?.();
    } catch (cause) { setError(announcementError(cause)); }
    finally { sendingRef.current = false; setSending(false); }
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity disabled={sending} accessibilityRole="button" accessibilityLabel={preview ? 'Back to announcement form' : 'Close announcements'} hitSlop={8} onPress={preview ? () => setPreview(false) : close} style={styles.headerButton}>
            <Ionicons name={preview ? 'arrow-back' : 'close'} size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.heading}>{preview ? 'Announcement preview' : initialAnnouncement ? 'Update announcement' : 'New announcement'}</Text>
          <View style={styles.headerButton}><Ionicons name="megaphone-outline" size={24} color="#E8505B" /></View>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          <View style={styles.introduction}>
            <View style={styles.iconCircle}><Ionicons name="megaphone" size={27} color="#E8505B" /></View>
            <Text style={styles.title}>{sent ? (initialAnnouncement ? 'Announcement updated' : 'Announcement sent') : preview ? 'Review your announcement' : initialAnnouncement ? 'Update your announcement' : 'Create an announcement'}</Text>
            <Text style={styles.description}>{sent ? 'All users can view your message from their notification bell.' : preview ? 'Check your title and message before sending.' : 'Prepare a common message for all TasteTrail users.'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Audience</Text>
            <View style={styles.audience}><Ionicons name="people-outline" size={20} color="#E8505B" /><Text style={styles.audienceText}>All users</Text></View>
            <Text style={styles.description}>This announcement is intended for everyone.</Text>
          </View>
          {sent ? <View style={styles.card}><Ionicons name="checkmark-circle" size={36} color="#4CAF50" /><Text style={styles.label}>{initialAnnouncement ? 'Updated for all users' : 'Sent to all users'}</Text><Text style={styles.description}>Your announcement is now available in the app notifications.</Text></View> : preview ? <View style={styles.card}>
            <View style={styles.previewLabel}><Ionicons name="notifications-outline" size={18} color="#E8505B" /><Text style={styles.label}>TasteTrail announcement</Text></View>
            <Text style={styles.previewTitle}>{title.trim()}</Text>
            <Text style={styles.previewMessage}>{message.trim()}</Text>
          </View> : <View style={styles.card}>
            <View style={styles.fieldHeading}><Text style={styles.label}>Title</Text><Text style={styles.count}>{title.length}/{TITLE_LIMIT}</Text></View>
            <TextInput value={title} editable={!sending} onChangeText={value => { setTitle(value); requestId.current = null; }} maxLength={TITLE_LIMIT} placeholder="e.g. A new feature is here" placeholderTextColor="#999" style={styles.input} accessibilityLabel="Announcement title" />
            <View style={styles.fieldHeading}><Text style={styles.label}>Message</Text><Text style={styles.count}>{message.length}/{MESSAGE_LIMIT}</Text></View>
            <TextInput value={message} editable={!sending} onChangeText={value => { setMessage(value); requestId.current = null; }} maxLength={MESSAGE_LIMIT} multiline textAlignVertical="top" placeholder="Write your announcement for all users..." placeholderTextColor="#999" style={[styles.input, styles.messageInput]} accessibilityLabel="Announcement message" />
          </View>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {preview && <TouchableOpacity disabled={sending} accessibilityRole="button" onPress={() => { setPreview(false); setError(''); }} style={styles.editButton}><Text style={styles.editButtonText}>Edit announcement</Text></TouchableOpacity>}
          <TouchableOpacity disabled={sending} accessibilityRole="button" onPress={sent ? (initialAnnouncement ? close : () => setSent(false)) : preview ? send : previewAnnouncement} style={[styles.primaryButton, sending && styles.disabled]}>
            <Ionicons name={sent ? 'checkmark' : preview ? 'send-outline' : 'eye-outline'} size={20} color="#FFF" /><Text style={styles.primaryButtonText}>{sending ? (initialAnnouncement ? 'Updating...' : 'Sending...') : sent ? (initialAnnouncement ? 'Done' : 'Create another announcement') : preview ? (initialAnnouncement ? 'Update announcement' : 'Send to all users') : 'Preview announcement'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAF7' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: '#333' },
  body: { padding: 20, gap: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  introduction: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  iconCircle: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1F3' },
  title: { fontSize: 22, fontWeight: '700', color: '#333', textAlign: 'center' },
  description: { fontSize: 13, lineHeight: 20, color: '#888' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, gap: 12, borderWidth: 1, borderColor: '#EDF1F6' },
  label: { fontSize: 14, fontWeight: '700', color: '#333' },
  audience: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#FFF1F3' },
  audienceText: { color: '#E8505B', fontSize: 14, fontWeight: '600' },
  fieldHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  count: { fontSize: 11, color: '#999' },
  input: { backgroundColor: '#FAFAF7', borderColor: '#E7ECF4', borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, color: '#333' },
  messageInput: { minHeight: 170, lineHeight: 22 },
  previewLabel: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  previewTitle: { fontSize: 19, fontWeight: '700', color: '#333' },
  previewMessage: { fontSize: 14, lineHeight: 23, color: '#666' },
  error: { color: '#C62828', fontSize: 13, lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
  primaryButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 26, backgroundColor: '#E8505B', paddingHorizontal: 16, paddingVertical: 14 },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  editButton: { alignItems: 'center', paddingVertical: 12 },
  editButtonText: { color: '#E8505B', fontWeight: '600', fontSize: 14 },
  disabled: { opacity: 0.6 },
});
