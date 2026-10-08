import { auth, db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SignupUser {
  id: string;
  name: string;
  email: string;
  bio: string;
  location: string;
  joinedAt: number | null;
  gender: string;
  role: string;
  status: string;
  isOnline: boolean | null;
}

const textField = (value: unknown): string => typeof value === 'string' ? value : '';
const dateKey = (value: number) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
const genderFilters = ['All Users', 'Male', 'Female', 'Others'] as const;
type GenderFilter = typeof genderFilters[number];
type InfoPanel = { title: string; message?: string; userId?: string } | null;

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<SignupUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('All Users');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [todayOnly, setTodayOnly] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [info, setInfo] = useState<InfoPanel>(null);
  const [today, setToday] = useState(() => dateKey(Date.now()));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setInterval(() => setToday(dateKey(Date.now())), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let unsubscribeUsers: (() => void) | undefined;
    let generation = 0;
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      const currentGeneration = ++generation;
      unsubscribeUsers?.();
      unsubscribeUsers = undefined;
      setUsers([]);
      setInfo(null);
      setSelectedIds([]);
      setError('');
      setLoading(true);
      if (!user) {
        setError('Please sign in with an admin account to view users.');
        setLoading(false);
        return;
      }

      // Check claims before reading the collection, including locally cached records.
      void user.getIdTokenResult(true).then(({ claims }) => {
        if (generation !== currentGeneration) return;
        const isAdmin = claims.admin === true || claims.admin === 'true'
          || claims.isAdmin === true || claims.role === 'admin'
          || (Array.isArray(claims.roles) && claims.roles.includes('admin'));
        if (!isAdmin) {
          setError('Only admins can view registered users.');
          setLoading(false);
          return;
        }

        unsubscribeUsers = onSnapshot(collection(db, 'users'), snapshot => {
          if (generation !== currentGeneration) return;
          const registeredUsers = snapshot.docs.map(record => {
            const data = record.data();
            return {
              id: record.id,
              name: textField(data.name),
              email: textField(data.email),
              bio: textField(data.bio),
              location: textField(data.location),
              joinedAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : null,
              gender: textField(data.gender).trim().toLowerCase(),
              role: textField(data.role) || 'Member',
              status: textField(data.status) || 'registered',
              isOnline: typeof data.isOnline === 'boolean' ? data.isOnline : null,
            };
          });
          // Sorting here also includes older records without a createdAt field.
          registeredUsers.sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0)
            || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
          setUsers(registeredUsers);
          setLoading(false);
          setError('');
        }, cause => {
          if (generation !== currentGeneration) return;
          setUsers([]);
          setLoading(false);
          setError(cause.code === 'permission-denied'
            ? 'Unable to access users. Please contact the app administrator.'
            : 'Could not load registered users. Check your connection and try again.');
        });
      }).catch(() => {
        if (generation !== currentGeneration) return;
        setLoading(false);
        setError('Could not verify admin access. Please try again.');
      });
    });
    return () => {
      generation++;
      unsubscribeAuth();
      unsubscribeUsers?.();
    };
  }, [retry]);

  const searchTerm = search.trim().toLowerCase();
  const newToday = users.filter(user => user.joinedAt !== null && dateKey(user.joinedAt) === today).length;
  const hasActivity = users.some(user => user.isOnline !== null);
  const activeNow = users.filter(user => user.isOnline === true).length;
  const filteredUsers = users.filter(user => {
    const genderMatches = genderFilter === 'All Users'
      || (genderFilter === 'Male' && ['male', 'man'].includes(user.gender))
      || (genderFilter === 'Female' && ['female', 'woman'].includes(user.gender))
      || (genderFilter === 'Others' && !['male', 'man', 'female', 'woman'].includes(user.gender));
    return genderMatches
      && (!todayOnly || (user.joinedAt !== null && dateKey(user.joinedAt) === today))
      && [user.name, user.email, user.id, user.location].some(value => value.toLowerCase().includes(searchTerm));
  }).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name)
    : sort === 'oldest' ? (a.joinedAt ?? 0) - (b.joinedAt ?? 0) : (b.joinedAt ?? 0) - (a.joinedAt ?? 0));
  const selectedCount = selectedIds.filter(id => users.some(user => user.id === id)).length;
  const detailUser = users.find(user => user.id === info?.userId);
  const toggleSelected = (id: string) => setSelectedIds(current => current.includes(id)
    ? current.filter(value => value !== id) : [...current, id]);
  const displayDate = (value: number | null) => value !== null
    ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Colombo' })
    : 'Not available';
  const ready = !loading && !error;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Tabs.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#E8505B" />
            <Text style={styles.adminText}>ADMIN CONSOLE</Text>
          </View>
          <Text style={styles.title}>Users</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon} hitSlop={8} disabled={!ready}
            onPress={() => setTodayOnly(value => !value)} accessibilityRole="button"
            accessibilityLabel={todayOnly ? 'Show all users' : 'Show today’s sign-ups'} accessibilityState={{ selected: todayOnly }}>
            <Ionicons name={todayOnly ? 'notifications' : 'notifications-outline'} size={23} color={todayOnly ? '#E8505B' : '#71829D'} />
            {ready && newToday > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} accessibilityRole="button" accessibilityLabel="Admin profile"
            onPress={() => router.push('/admin/profile' as any)}>
            <Ionicons name="person-circle" size={32} color="#E8505B" />
            <View style={styles.profileStatusDot} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Users</Text>
          <View style={styles.statValueRow}><Text style={styles.statValue}>{ready ? users.length.toLocaleString() : '—'}</Text><Text style={styles.liveLabel}>Live</Text></View>
        </View>
        <TouchableOpacity style={styles.statCard} accessibilityRole="button" accessibilityLabel="Active user tracking information"
          onPress={() => setInfo({ title: 'Active now', message: hasActivity ? 'This count shows users marked online in their saved profile.' : 'Live activity is not recorded yet. This count will appear when activity data is available.' })}>
          <Text style={styles.statLabel}>Active Now</Text>
          <View style={styles.statValueRow}><Text style={styles.statValue}>{ready && hasActivity ? activeNow.toLocaleString() : '—'}</Text><View style={styles.greenDot} /></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} disabled={!ready} accessibilityRole="button" accessibilityLabel="Show today’s sign-ups"
          onPress={() => setTodayOnly(value => !value)}>
          <Text style={styles.statLabel}>New Today</Text>
          <View style={styles.statValueRow}><Text style={styles.statValue}>{ready ? `+${newToday}` : '—'}</Text><Ionicons name="trending-up" size={15} color="#E8505B" /></View>
        </TouchableOpacity>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color="#BCC9DC" />
        <TextInput style={styles.searchInput} placeholder="Search name, email or account ID"
          placeholderTextColor="#9AAAC2" value={search} onChangeText={setSearch}
          autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search registered users" />
        {!!search && <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close" size={18} color="#9AAAC2" />
        </TouchableOpacity>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filterContent}>
        {genderFilters.map(filter => <TouchableOpacity key={filter} accessibilityRole="button"
          accessibilityState={{ selected: genderFilter === filter }} onPress={() => setGenderFilter(filter)}
          style={[styles.chip, genderFilter === filter && styles.selectedChip]}>
          <Text style={[styles.chipText, genderFilter === filter && styles.selectedChipText]}>{filter}</Text>
          {filter === 'All Users' && ready && <View style={[styles.chipCount, genderFilter === filter && styles.selectedChipCount]}>
            <Text style={[styles.chipCountText, genderFilter === filter && styles.selectedChipText]}>{users.length}</Text>
          </View>}
        </TouchableOpacity>)}
        <TouchableOpacity style={styles.chip} accessibilityRole="button" accessibilityLabel={`Sort users: ${sort}`}
          onPress={() => setSort(current => current === 'newest' ? 'oldest' : current === 'oldest' ? 'name' : 'newest')}>
          <Ionicons name="swap-vertical" size={14} color="#9AAAC2" /><Text style={styles.chipText}>Sort {sort === 'newest' ? '↓' : sort === 'oldest' ? '↑' : 'A–Z'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{todayOnly ? 'Today’s sign-ups' : 'Registered users'}</Text>
        <TouchableOpacity disabled={!ready} accessibilityRole="button"
          onPress={() => { setBatchMode(value => !value); setSelectedIds([]); }} style={styles.batchButton}>
          <Text style={styles.batchText}>{batchMode ? 'Done' : 'Batch select'}</Text><Ionicons name="chevron-forward" size={14} color="#E8505B" />
        </TouchableOpacity>
      </View>
      {batchMode && ready && <View style={styles.selectionBar}>
        <Text style={styles.selectionText}>{selectedCount} selected</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => setSelectedIds(filteredUsers.map(user => user.id))}>
          <Text style={styles.batchText}>Select all shown</Text>
        </TouchableOpacity>
      </View>}
      {loading ? (
        <View style={styles.state}><ActivityIndicator size="large" color="#E8505B" /><Text style={styles.stateText}>Loading users...</Text></View>
      ) : error ? (
        <View style={styles.state}>
          <Ionicons name="alert-circle-outline" size={40} color="#E8505B" />
          <Text style={styles.stateText} accessibilityRole="alert">{error}</Text>
          <TouchableOpacity style={styles.retryButton} accessibilityRole="button" onPress={() => { setLoading(true); setRetry(value => value + 1); }}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={filteredUsers} keyExtractor={user => user.id} keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={searchTerm ? <Text style={styles.results}>{filteredUsers.length} {filteredUsers.length === 1 ? 'match' : 'matches'}</Text> : null}
          ListEmptyComponent={<View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#CCC" />
            <Text style={styles.emptyTitle}>{users.length ? 'No matching users' : 'No registered users yet'}</Text>
            <Text style={styles.stateText}>{users.length ? 'Try another search or filter. Missing gender details appear under Others.' : 'New sign-ups will appear here automatically.'}</Text>
          </View>}
          renderItem={({ item }) => (
            <View style={[styles.card, batchMode && selectedIds.includes(item.id) && styles.selectedCard]}>
              <View style={styles.cardHeader}>
                {batchMode && <TouchableOpacity onPress={() => toggleSelected(item.id)} accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedIds.includes(item.id) }} accessibilityLabel={`Select ${item.name || item.email}`}>
                  <Ionicons name={selectedIds.includes(item.id) ? 'checkbox' : 'square-outline'} size={22} color="#E8505B" />
                </TouchableOpacity>}
                <View style={styles.avatar}>
                  <Text style={styles.initial}>{(item.name.trim()[0] || item.email[0] || 'U').toUpperCase()}</Text>
                  {item.isOnline === true && <View style={styles.avatarDot} />}
                </View>
                <View style={styles.identity}>
                  <View style={styles.nameRow}><Text style={styles.name}>{item.name || 'Name not provided'}</Text>
                    <View style={styles.roleBadge}><Text style={styles.roleText} numberOfLines={1}>{item.role}</Text></View>
                  </View>
                  <Text selectable style={styles.email} numberOfLines={1}>{item.email || 'Email not provided'}</Text>
                </View>
                <TouchableOpacity hitSlop={8} onPress={() => setInfo({ title: 'User details', userId: item.id })}
                  accessibilityRole="button" accessibilityLabel={`View details for ${item.name || item.email}`}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#9AAAC2" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.label, styles.cardAccountLabel]}>ACCOUNT ID</Text>
              <View style={styles.idRow}>
                <View style={styles.idPill}><Text selectable numberOfLines={1} style={styles.idText}>{item.id}</Text></View>
                <TouchableOpacity hitSlop={8} accessibilityRole="button" accessibilityLabel="View account ID to copy"
                  onPress={() => setInfo({ title: 'Account ID', userId: item.id, message: 'Touch and hold the account ID to copy it.' })}>
                  <Ionicons name="copy-outline" size={18} color="#9AAAC2" />
                </TouchableOpacity>
              </View>
              <View style={styles.joinedRow}>
                <View><Text style={styles.joinedLabel}>Joined</Text><Text style={styles.joinedDate}>{displayDate(item.joinedAt)}</Text></View>
                <View style={styles.statusRow}><View style={[styles.statusDot, (item.status === 'active' || item.isOnline === true) && styles.onlineDot]} />
                  <Text style={styles.statusText}>{item.isOnline === true ? 'Active' : item.status === 'registered' ? 'Registered' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionsInfo} onPress={() => setInfo({ title: 'Account actions', message: 'Blocking and removing users are not available yet. You can view, search, and select users here.' })}
                  accessibilityRole="button" accessibilityLabel="Account action availability"><Ionicons name="information-circle-outline" size={16} color="#9AAAC2" /></TouchableOpacity>
                <TouchableOpacity disabled accessibilityRole="button" accessibilityState={{ disabled: true }} style={[styles.actionButton, styles.blockButton]}>
                  <Ionicons name="ban-outline" size={14} color="#E99A20" /><Text style={styles.blockText}>Block</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled accessibilityRole="button" accessibilityState={{ disabled: true }} style={[styles.actionButton, styles.removeButton]}>
                  <Ionicons name="trash-outline" size={14} color="#E8505B" /><Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      <Modal visible={info !== null} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setInfo(null)} accessibilityRole="button" accessibilityLabel="Close details" />
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalHeading}><Text style={styles.sectionTitle}>{info?.title}</Text>
              <TouchableOpacity onPress={() => setInfo(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close details"><Ionicons name="close" size={22} color="#71829D" /></TouchableOpacity>
            </View>
            <ScrollView>
              {!!info?.message && <Text style={styles.modalMessage}>{info.message}</Text>}
              {detailUser && <>
                <Text style={styles.label}>NAME</Text><Text selectable style={styles.detail}>{detailUser.name || 'Not provided'}</Text>
                <Text style={styles.label}>EMAIL</Text><Text selectable style={styles.detail}>{detailUser.email || 'Not provided'}</Text>
                <Text style={styles.label}>ACCOUNT ID</Text><Text selectable style={styles.detail}>{detailUser.id}</Text>
                <Text style={styles.label}>JOINED</Text><Text style={styles.detail}>{displayDate(detailUser.joinedAt)}</Text>
                <Text style={styles.label}>GENDER</Text><Text style={styles.detail}>{detailUser.gender || 'Not provided'}</Text>
                {!!detailUser.bio && <><Text style={styles.label}>BIO</Text><Text style={styles.detail}>{detailUser.bio}</Text></>}
                {!!detailUser.location && <><Text style={styles.label}>LOCATION</Text><Text style={styles.detail}>{detailUser.location}</Text></>}
              </>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, backgroundColor: '#FFF' },
  headerLeft: { flex: 1 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  adminText: { fontSize: 12, fontWeight: '600', color: '#333', marginLeft: 6, letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { position: 'relative', padding: 4 },
  notificationDot: { position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8505B', borderWidth: 1, borderColor: '#FFF' },
  profileButton: { position: 'relative', marginLeft: 12 },
  profileStatusDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#FFF' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 18 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EDF1F6', boxShadow: '0px 2px 4px rgba(24,39,65,0.03)' },
  statLabel: { color: '#8C9DB9', fontSize: 11, fontWeight: '600', marginBottom: 8 },
  statValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  statValue: { color: '#15203A', fontWeight: 'bold', fontSize: 19 },
  liveLabel: { color: '#19B891', fontSize: 9, fontWeight: '600' },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#65D4B1' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E7ECF4', borderRadius: 16, backgroundColor: '#FFF' },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 12, color: '#15203A' },
  filters: { flexGrow: 0, flexShrink: 0, marginBottom: 18 },
  filterContent: { paddingHorizontal: 12, gap: 7, alignItems: 'center' },
  chip: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E7ECF4', backgroundColor: '#FFF' },
  selectedChip: { backgroundColor: '#E8505B', borderColor: '#E8505B' },
  chipText: { color: '#71829D', fontSize: 11, fontWeight: '600' },
  selectedChipText: { color: '#FFF' },
  chipCount: { backgroundColor: '#EDF1F6', borderRadius: 8, paddingHorizontal: 5, minWidth: 16, alignItems: 'center' },
  selectedChipCount: { backgroundColor: '#ED7B83' },
  chipCountText: { fontSize: 10, color: '#71829D', fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12 },
  sectionTitle: { color: '#15203A', fontWeight: 'bold', fontSize: 16 },
  batchButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 5 },
  batchText: { fontSize: 11, color: '#E8505B', fontWeight: '600' },
  selectionBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  selectionText: { fontSize: 12, color: '#71829D' },
  list: { flexGrow: 1, paddingHorizontal: 12, paddingBottom: 24 },
  results: { fontSize: 13, color: '#999', marginBottom: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#EDF1F6', boxShadow: '0px 3px 6px rgba(24,39,65,0.04)' },
  selectedCard: { borderColor: '#E8505B' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  avatar: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFF1F3', borderWidth: 1, borderColor: '#FFE5E9', justifyContent: 'center', alignItems: 'center' },
  initial: { fontSize: 22, fontWeight: '500', color: '#E8505B' },
  avatarDot: { position: 'absolute', right: -3, bottom: -3, height: 12, width: 12, borderRadius: 6, backgroundColor: '#11BA86', borderWidth: 2, borderColor: '#FFF' },
  identity: { flex: 1 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginBottom: 4 },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '600', color: '#15203A' },
  roleBadge: { maxWidth: 100, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: '#FFF1F3', borderWidth: 1, borderColor: '#FFE4E9' },
  roleText: { fontSize: 10, color: '#E8505B', fontWeight: '600', textTransform: 'capitalize' },
  email: { fontSize: 11, color: '#8192AF' },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: '#91A3BF', marginTop: 10, marginBottom: 5 },
  cardAccountLabel: { marginTop: 4 },
  detail: { fontSize: 14, color: '#15203A', lineHeight: 21 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'space-between' },
  idPill: { flexShrink: 1, backgroundColor: '#F4F7FB', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7 },
  idText: { fontSize: 10, fontWeight: '600', color: '#536581', fontFamily: 'monospace' },
  joinedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingBottom: 8 },
  joinedLabel: { color: '#91A3BF', fontSize: 10, fontWeight: '600', marginBottom: 3 },
  joinedDate: { color: '#15203A', fontSize: 11, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#AAB6C9' },
  onlineDot: { backgroundColor: '#11BA86' },
  statusText: { color: '#71829D', fontSize: 10, fontWeight: '600' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#F0F3F8', paddingTop: 7 },
  actionsInfo: { marginRight: 'auto', padding: 3 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, opacity: 0.65 },
  blockButton: { backgroundColor: '#FFF9E9', borderColor: '#FFE4A5' },
  removeButton: { backgroundColor: '#FFF1F3', borderColor: '#FFDDE4' },
  blockText: { color: '#E99A20', fontSize: 11, fontWeight: '600' },
  removeText: { color: '#E8505B', fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(21,32,58,0.3)', padding: 24, justifyContent: 'center' },
  modalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalMessage: { fontSize: 14, color: '#71829D', lineHeight: 23 },
  state: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  stateText: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#666', fontSize: 18, fontWeight: '600', marginTop: 16 },
  retryButton: { backgroundColor: '#E8505B', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20, marginTop: 20 },
  retryText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});
