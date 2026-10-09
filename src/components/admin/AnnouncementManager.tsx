import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { announcementError, deleteAnnouncement, type Announcement } from '@/services/announcementService';
import AnnouncementForm from './AnnouncementForm';

interface Props { visible: boolean; onClose: () => void; }
export default function AnnouncementManager({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { announcements, loading, error, refresh } = useAnnouncements();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement>();
  const [deleteTarget, setDeleteTarget] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const busy = useRef(false);
  const close = () => {
    if (busy.current) return;
    setFormOpen(false); setEditing(undefined); setDeleteTarget(undefined); setActionError(''); setSuccess(''); onClose();
  };
  const openForm = (item?: Announcement) => {
    if (busy.current) return;
    setEditing(item); setFormOpen(true); setDeleteTarget(undefined); setActionError(''); setSuccess('');
  };
  const remove = async (id: string) => {
    if (busy.current) return;
    busy.current = true; setDeleting(true); setActionError(''); setSuccess('');
    try { await deleteAnnouncement(id); setDeleteTarget(undefined); setSuccess('Announcement deleted for all users.'); }
    catch (cause) { setActionError(announcementError(cause)); }
    finally { busy.current = false; setDeleting(false); }
  };
  return <>
    <Modal visible={visible && !formOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity disabled={deleting} onPress={close} accessibilityRole="button" accessibilityLabel="Close announcements" hitSlop={8}><Ionicons name="close" size={26} color="#666" /></TouchableOpacity>
          <Text style={styles.heading}>Announcements</Text>
          <Ionicons name="megaphone-outline" size={24} color="#E8505B" />
        </View>
        <FlatList data={loading || error ? [] : announcements} keyExtractor={item => item.id} contentContainerStyle={styles.list}
          ListHeaderComponent={<View style={styles.intro}>
            <TouchableOpacity disabled={deleting} onPress={() => openForm()} accessibilityRole="button" style={styles.primary}><Ionicons name="add" size={22} color="#FFF" /><Text style={styles.primaryText}>Create new announcement</Text></TouchableOpacity>
            <Text style={styles.description}>Manage announcements shared with all users.</Text>
            {!!success && <Text accessibilityRole="alert" style={styles.success}>{success}</Text>}
            {!!actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
          </View>}
          ListEmptyComponent={loading ? <ActivityIndicator color="#E8505B" /> : error ? <View style={styles.empty}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={refresh} accessibilityRole="button" style={styles.outline}><Text style={styles.outlineText}>Retry</Text></TouchableOpacity></View> : <View style={styles.empty}><Text style={styles.cardTitle}>No announcements yet</Text><Text style={styles.description}>Create your first announcement to notify users.</Text></View>}
          renderItem={({ item }) => <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.metadata}>All users · {item.createdAt ? item.createdAt.toLocaleDateString() : 'Just now'}{item.updatedAt ? ` · Updated ${item.updatedAt.toLocaleDateString()}` : ''}</Text>
            <Text style={styles.message}>{item.message}</Text>
            {deleteTarget === item.id ? <View style={styles.confirmation}>
              <Text style={styles.message}>Delete this announcement for all users?</Text>
              <View style={styles.actions}>
                <TouchableOpacity disabled={deleting} onPress={() => { setDeleteTarget(undefined); setActionError(''); }} accessibilityRole="button" style={styles.outline}><Text style={styles.outlineText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity disabled={deleting} onPress={() => remove(item.id)} accessibilityRole="button" style={[styles.action, deleting && styles.disabled]}><Text style={styles.primaryText}>{deleting ? 'Deleting...' : 'Confirm delete'}</Text></TouchableOpacity>
              </View>
            </View> : <View style={styles.actions}>
              <TouchableOpacity disabled={deleting} onPress={() => openForm(item)} accessibilityRole="button" style={styles.action}><Text style={styles.primaryText}>Update</Text></TouchableOpacity>
              <TouchableOpacity disabled={deleting} onPress={() => { setDeleteTarget(item.id); setActionError(''); setSuccess(''); }} accessibilityRole="button" style={styles.outline}><Text style={styles.outlineText}>Delete</Text></TouchableOpacity>
            </View>}
          </View>}
        />
      </View>
    </Modal>
    {visible && formOpen && <AnnouncementForm key={editing?.id || 'new'} visible initialAnnouncement={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); setSuccess(editing ? 'Announcement updated for all users.' : 'Announcement sent to all users.'); }} />}
  </>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAF7' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  heading: { flex: 1, fontSize: 20, fontWeight: '700', color: '#333' },
  list: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 20, gap: 16 },
  intro: { gap: 14, paddingBottom: 8 },
  primary: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 52, borderRadius: 26, backgroundColor: '#E8505B', padding: 14 },
  primaryText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 20, color: '#888' },
  card: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EDF1F6', padding: 18, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  metadata: { fontSize: 12, lineHeight: 18, color: '#888' },
  message: { fontSize: 14, lineHeight: 23, color: '#666' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 4 },
  action: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8505B', borderRadius: 22 },
  outline: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderColor: '#E8505B', borderWidth: 1, borderRadius: 22 },
  outlineText: { color: '#E8505B', fontSize: 14, fontWeight: '700' },
  confirmation: { gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 32 },
  success: { color: '#287D49', fontSize: 13, lineHeight: 20 },
  error: { color: '#C62828', fontSize: 13, lineHeight: 20 },
  disabled: { opacity: 0.6 },
});
