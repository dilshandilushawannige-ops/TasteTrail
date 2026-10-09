import { useAnnouncements } from '@/hooks/useAnnouncements';
import { announcementError, markAnnouncementRead } from '@/services/announcementService';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AnnouncementNotifications() {
  const { announcements, readIds, unread, loading, error, refresh } = useAnnouncements();
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readError, setReadError] = useState('');
  const [reading, setReading] = useState(false);
  const busy = useRef(false);
  const insets = useSafeAreaInsets();
  const selected = announcements.find(item => item.id === selectedId);
  const openMessage = async (id: string) => {
    if (busy.current) return;
    setSelectedId(id); setReadError('');
    if (readIds.has(id)) return;
    busy.current = true; setReading(true);
    try { await markAnnouncementRead(id); }
    catch (cause) { setReadError(announcementError(cause)); }
    finally { busy.current = false; setReading(false); }
  };
  const close = () => { setVisible(false); setSelectedId(null); setReadError(''); };
  return <>
    <TouchableOpacity style={styles.bell} accessibilityRole="button" accessibilityLabel={error ? 'Open notifications' : `Open notifications, ${unread} unread`} onPress={() => { setVisible(true); setSelectedId(null); setReadError(''); }}>
      <Ionicons name="notifications-outline" size={24} color="#333" />
      {!error && !loading && unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}
    </TouchableOpacity>
    <Modal visible={visible} presentationStyle="fullScreen" animationType="slide" onRequestClose={close}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={selected ? 'Back to notifications' : 'Close notifications'} onPress={selected ? () => { setSelectedId(null); setReadError(''); } : close} hitSlop={8}><Ionicons name={selected ? 'arrow-back' : 'close'} size={24} color="#666" /></TouchableOpacity>
          <Text style={styles.heading}>Notifications</Text>
        </View>
        {loading ? <View style={styles.state}><ActivityIndicator color="#E8505B" /><Text style={styles.muted}>Loading notifications...</Text></View>
          : error ? <View style={styles.state}><Text style={styles.muted} accessibilityRole="alert">{error}</Text><TouchableOpacity style={styles.button} onPress={refresh}><Text style={styles.buttonText}>Retry</Text></TouchableOpacity></View>
          : selected ? <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.card}>
              <View style={styles.sender}><Ionicons name="megaphone-outline" size={20} color="#E8505B" /><Text style={styles.senderText}>TasteTrail announcement</Text></View>
              <Text style={styles.title}>{selected.title}</Text>
              <Text style={styles.date}>{selected.createdAt?.toLocaleString() || 'Just now'}</Text>
              <Text style={styles.message}>{selected.message}</Text>
            </View>
            {!!readError && <View style={styles.card}><Text style={styles.error} accessibilityRole="alert">{readError}</Text><TouchableOpacity disabled={reading} onPress={() => openMessage(selected.id)}><Text style={styles.senderText}>{reading ? 'Saving...' : 'Retry marking as read'}</Text></TouchableOpacity></View>}
          </ScrollView>
          : <FlatList data={announcements} keyExtractor={item => item.id} contentContainerStyle={styles.body}
            ListEmptyComponent={<View style={styles.state}><Ionicons name="notifications-outline" size={42} color="#AAA" /><Text style={styles.title}>No announcements yet</Text><Text style={styles.muted}>Messages from TasteTrail will appear here.</Text></View>}
            renderItem={({ item }) => <TouchableOpacity disabled={reading} onPress={() => openMessage(item.id)} accessibilityRole="button" accessibilityLabel={`${readIds.has(item.id) ? 'Read' : 'Unread'} announcement: ${item.title}`} style={[styles.card, !readIds.has(item.id) && styles.unreadCard]}>
              <View style={styles.sender}><Ionicons name="megaphone-outline" size={19} color="#E8505B" /><Text style={styles.senderText}>TasteTrail</Text>{!readIds.has(item.id) && <View style={styles.unreadDot} />}</View>
              <Text style={styles.title}>{item.title}</Text><Text numberOfLines={2} style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{item.createdAt?.toLocaleString() || 'Just now'}</Text>
            </TouchableOpacity>} />}
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  bell: { padding: 4 }, badge: { position: 'absolute', right: -5, top: -4, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#E8505B', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  screen: { flex: 1, backgroundColor: '#FAFAF7' }, header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  heading: { fontSize: 20, color: '#333', fontWeight: '700' }, body: { flexGrow: 1, padding: 20, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#EDF1F6', backgroundColor: '#FFF', gap: 10 }, unreadCard: { borderColor: '#F5B5BB', backgroundColor: '#FFF8F9' },
  sender: { flexDirection: 'row', alignItems: 'center', gap: 8 }, senderText: { color: '#E8505B', fontSize: 12, fontWeight: '600' }, unreadDot: { marginLeft: 'auto', height: 8, width: 8, borderRadius: 4, backgroundColor: '#E8505B' },
  title: { color: '#333', fontSize: 17, fontWeight: '700' }, message: { color: '#666', fontSize: 14, lineHeight: 23 }, date: { color: '#999', fontSize: 11 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }, muted: { color: '#888', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  error: { color: '#C62828', fontSize: 13, lineHeight: 20 }, button: { backgroundColor: '#E8505B', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 24 }, buttonText: { color: '#FFF', fontWeight: '600' },
});
