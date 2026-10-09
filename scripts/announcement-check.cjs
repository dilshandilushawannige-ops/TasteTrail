const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
function load(file, modules) {
  const code = transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false,
    presets: [['@babel/preset-typescript', { allExtensions: true, isTSX: file.endsWith('.tsx') }]],
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {};
  vm.runInNewContext(code, { exports, Date, Error, Set, require: name => { assert.ok(name in modules, name); return modules[name]; } });
  return exports;
}
function hooks() {
  let slots = [], cursor = 0, effects = [];
  return { react: {
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect: effect => effects.push(effect),
  }, reset() { cursor = 0; effects = []; }, runEffects() { return effects.map(effect => effect()); } };
}
const jsx = (type, props) => ({ type, props });
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) : Array.isArray(tree) ? tree.map(text).join('') : text(tree?.props?.children || '');
const native = { ...Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ActivityIndicator', 'FlatList', 'Modal', 'ScrollView', 'TextInput', 'KeyboardAvoidingView'].map(n => [n, n])), StyleSheet: { create: s => s }, Platform: { OS: 'android' } };
const common = { 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' }, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) } };
let claims = { admin: true }, writes = 0, receipts = [];
const auth = { currentUser: { uid: 'admin', getIdTokenResult: async () => ({ claims }) } };
const records = new Map();
const service = load('src/services/announcementService.ts', {
  '@/firebaseConfig': { auth, db: {} }, 'firebase/firestore': {
    collection: (_db, ...path) => path.join('/'), doc: (_db, ...path) => ({ id: path.at(-1) || 'generated', path: path.join('/') }),
    serverTimestamp: () => 'SERVER_TIME',
    runTransaction: async (_db, callback) => callback({
      get: async ref => ({ exists: () => records.has(ref.id), data: () => records.get(ref.id) }),
      set: (ref, data) => { records.set(ref.id, data); writes++; },
      update: (ref, data) => records.set(ref.id, { ...records.get(ref.id), ...data }),
      delete: ref => records.delete(ref.id),
    }),
    setDoc: async (ref, data) => receipts.push({ ref, data }),
  },
});
async function main() {
  claims = {}; await assert.rejects(service.publishAnnouncement('a1', 'Title', 'Body'), /Only admins/); claims = { admin: true };
  await assert.rejects(service.publishAnnouncement('a1', ' ', 'Body'), /Enter a title/);
  await assert.rejects(service.publishAnnouncement('a1', 'T'.repeat(81), 'Body'), /Enter a title/);
  await service.publishAnnouncement('a1', ' Title ', ' Body ');
  assert.equal(records.get('a1').audience, 'all'); assert.equal(records.get('a1').createdAt, 'SERVER_TIME');
  await service.publishAnnouncement('a1', 'Title', 'Body'); assert.equal(writes, 1);
  await assert.rejects(service.publishAnnouncement('a1', 'Changed', 'Body'), /already been used/);
  claims = {}; await assert.rejects(service.updateAnnouncement('a1', 'Changed', 'Body'), /Only admins/);
  await assert.rejects(service.deleteAnnouncement('a1'), /Only admins/); claims = { admin: true };
  await service.updateAnnouncement('a1', ' Changed ', ' Updated body ');
  assert.equal(records.get('a1').title, 'Changed'); assert.equal(records.get('a1').message, 'Updated body');
  assert.equal(records.get('a1').createdBy, 'admin'); assert.equal(records.get('a1').createdAt, 'SERVER_TIME');
  assert.equal(records.get('a1').updatedBy, 'admin'); assert.equal(records.get('a1').updatedAt, 'SERVER_TIME');
  await assert.rejects(service.updateAnnouncement('missing', 'Title', 'Body'), /no longer exists/);
  await service.publishAnnouncement('a2', 'Other', 'Keep this'); await service.deleteAnnouncement('a1');
  assert.equal(records.has('a1'), false); assert.equal(records.has('a2'), true);
  await assert.rejects(service.deleteAnnouncement('a1'), /no longer exists/);
  auth.currentUser.uid = 'user1'; await service.markAnnouncementRead('a1');
  auth.currentUser.uid = 'user2'; await service.markAnnouncementRead('a1');
  assert.equal(receipts[0].ref.path, 'users/user1/announcementReads/a1');
  assert.equal(receipts[1].ref.path, 'users/user2/announcementReads/a1');
  console.log('PASS: admin-only publishing, validation, server timestamp, idempotent retry, and private per-user read receipts.');

  const h = hooks(); let authChanged; const listeners = new Map(); let unsubscribed = 0;
  class Timestamp { constructor(value) { this.value = value; } toDate() { return new Date(this.value); } }
  const hook = load('src/hooks/useAnnouncements.ts', {
    react: h.react, '@/firebaseConfig': { auth, db: {} }, '@/services/announcementService': service,
    'firebase/auth': { onAuthStateChanged: (_auth, callback) => { authChanged = callback; callback(auth.currentUser); return () => {}; } },
    'firebase/firestore': { Timestamp, collection: (_db, ...path) => path.join('/'), query: ref => ref, orderBy: () => ({}),
      onSnapshot: (path, next, error) => { listeners.set(path, { next, error }); return () => { unsubscribed++; }; } },
  }).useAnnouncements;
  const renderHook = () => { h.reset(); return hook(); }; renderHook(); h.runEffects();
  const messageDocs = [{ id: 'a1', data: () => ({ title: 'Title', message: 'Body', createdAt: new Timestamp(1000) }) }];
  const oldMessages = listeners.get('announcements'); oldMessages.next({ docs: messageDocs });
  listeners.get('users/user2/announcementReads').next({ docs: [] });
  assert.equal(renderHook().unread, 1); assert.equal(renderHook().loading, false);
  listeners.get('users/user2/announcementReads').next({ docs: [{ id: 'a1' }] }); assert.equal(renderHook().unread, 0);
  oldMessages.next({ docs: [{ id: 'a1', data: () => ({ title: 'Changed', message: 'Updated', createdAt: new Timestamp(1000), updatedAt: new Timestamp(2000) }) }] });
  assert.equal(renderHook().announcements[0].title, 'Changed'); assert.equal(renderHook().unread, 0);
  assert.equal(renderHook().announcements[0].updatedAt.getTime(), 2000);
  oldMessages.next({ docs: [] }); assert.equal(renderHook().announcements.length, 0); assert.equal(renderHook().unread, 0);
  auth.currentUser = { uid: 'user3' }; authChanged(auth.currentUser);
  assert.equal(unsubscribed, 2); assert.equal(renderHook().announcements.length, 0);
  oldMessages.next({ docs: messageDocs }); assert.equal(renderHook().announcements.length, 0);
  listeners.get('announcements').next({ docs: messageDocs }); listeners.get('users/user3/announcementReads').next({ docs: [] });
  assert.equal(renderHook().unread, 1);
  listeners.get('announcements').error({ code: 'permission-denied' }); assert.match(renderHook().error, /could not be accessed/);
  console.log('PASS: live messages and reads update badge; switching accounts clears state and ignores stale callbacks; listener failures are visible.');

  const formHooks = hooks(); let attempts = [], finish, fail = true;
  const Form = load('src/components/admin/AnnouncementForm.tsx', { ...common, react: formHooks.react,
    '@/services/announcementService': { ...service, createAnnouncementId: () => 'stable-id', publishAnnouncement: async (id, title, message) => {
      attempts.push({ id, title, message }); if (fail) throw new Error('Connection failed'); await new Promise(resolve => { finish = resolve; });
    } },
  }).default;
  const renderForm = () => { formHooks.reset(); return Form({ visible: true, onClose() {} }); };
  const findButton = label => nodes(renderForm()).find(n => n.type === 'TouchableOpacity' && text(n) === label);
  findButton('Preview announcement').props.onPress(); assert.match(text(renderForm()), /Enter an announcement/);
  nodes(renderForm()).find(n => n.props?.accessibilityLabel === 'Announcement title').props.onChangeText('Title');
  nodes(renderForm()).find(n => n.props?.accessibilityLabel === 'Announcement message').props.onChangeText('Body');
  findButton('Preview announcement').props.onPress(); await findButton('Send to all users').props.onPress();
  assert.match(text(renderForm()), /Connection failed/); assert.match(text(renderForm()), /Body/);
  fail = false; const send = findButton('Send to all users'); const sending = send.props.onPress(); await send.props.onPress();
  assert.equal(attempts.length, 2); assert.equal(attempts[0].id, attempts[1].id); finish(); await sending;
  assert.match(text(renderForm()), /Announcement sent/);
  console.log('PASS: form validates, preserves failed sends, reuses request ID on retry, prevents double taps, and confirms success.');

  const editHooks = hooks(); let updates = [], saved = 0;
  const EditForm = load('src/components/admin/AnnouncementForm.tsx', { ...common, react: editHooks.react,
    '@/services/announcementService': { ...service, updateAnnouncement: async (...args) => updates.push(args) },
  }).default;
  const renderEdit = () => { editHooks.reset(); return EditForm({ visible: true, initialAnnouncement: { id: 'existing', title: 'Original', message: 'Original body' }, onClose() {}, onSaved() { saved++; } }); };
  assert.equal(nodes(renderEdit()).find(n => n.props?.accessibilityLabel === 'Announcement title').props.value, 'Original');
  nodes(renderEdit()).find(n => n.props?.accessibilityLabel === 'Announcement message').props.onChangeText('Edited body');
  nodes(renderEdit()).find(n => n.type === 'TouchableOpacity' && text(n) === 'Preview announcement').props.onPress();
  await nodes(renderEdit()).find(n => n.type === 'TouchableOpacity' && text(n) === 'Update announcement').props.onPress();
  assert.deepEqual(updates[0], ['existing', 'Original', 'Edited body']); assert.equal(saved, 1);

  const managerHooks = hooks(); let deletions = [], deleteFails = true;
  const managerState = { announcements: [{ id: 'existing', title: 'Original', message: 'Original body', createdAt: null }], loading: false, error: '', refresh() {} };
  const Manager = load('src/components/admin/AnnouncementManager.tsx', { ...common, react: managerHooks.react,
    './AnnouncementForm': { __esModule: true, default: 'Form' }, '@/hooks/useAnnouncements': { useAnnouncements: () => managerState },
    '@/services/announcementService': { ...service, deleteAnnouncement: async id => { deletions.push(id); if (deleteFails) throw new Error('Connection failed'); } },
  }).default;
  const renderManager = () => { managerHooks.reset(); return Manager({ visible: true, onClose() {} }); };
  const managerCard = () => nodes(renderManager()).find(n => n.type === 'FlatList').props.renderItem({ item: managerState.announcements[0] });
  const cardButton = label => nodes(managerCard()).find(n => n.type === 'TouchableOpacity' && text(n) === label);
  cardButton('Update').props.onPress();
  assert.equal(nodes(renderManager()).find(n => n.type === 'Form').props.initialAnnouncement.id, 'existing');
  nodes(renderManager()).find(n => n.type === 'Form').props.onClose();
  nodes(nodes(renderManager()).find(n => n.type === 'FlatList').props.ListHeaderComponent).find(n => n.type === 'TouchableOpacity' && text(n) === 'Create new announcement').props.onPress();
  assert.equal(nodes(renderManager()).find(n => n.type === 'Form').props.initialAnnouncement, undefined);
  nodes(renderManager()).find(n => n.type === 'Form').props.onClose();
  cardButton('Delete').props.onPress(); assert.equal(deletions.length, 0);
  cardButton('Cancel').props.onPress(); assert.equal(deletions.length, 0);
  cardButton('Delete').props.onPress(); await cardButton('Confirm delete').props.onPress();
  assert.match(text(nodes(renderManager()).find(n => n.type === 'FlatList').props.ListHeaderComponent), /Connection failed/);
  deleteFails = false; await cardButton('Confirm delete').props.onPress();
  assert.deepEqual(deletions, ['existing', 'existing']); assert.match(text(nodes(renderManager()).find(n => n.type === 'FlatList').props.ListHeaderComponent), /deleted for all users/);
  console.log('PASS: admin updates/deletes only selected announcements; edit form prefills; manager creates, edits, confirms deletion and allows retry.');

  const bellHooks = hooks(); const state = { announcements: [{ id: 'a1', title: 'Title', message: 'Full message', createdAt: new Date() }], readIds: new Set(), unread: 1, loading: false, error: '', refresh() {} };
  let opened = [];
  const Bell = load('src/components/AnnouncementNotifications.tsx', { ...common, react: bellHooks.react,
    '@/hooks/useAnnouncements': { useAnnouncements: () => state },
    '@/services/announcementService': { ...service, markAnnouncementRead: async id => { opened.push(id); } },
  }).default;
  const renderBell = () => { bellHooks.reset(); return Bell(); };
  nodes(renderBell()).find(n => n.props?.accessibilityLabel === 'Open notifications, 1 unread').props.onPress();
  assert.equal(opened.length, 0);
  const list = nodes(renderBell()).find(n => n.type === 'FlatList');
  const card = list.props.renderItem({ item: state.announcements[0] }); await card.props.onPress();
  assert.deepEqual(opened, ['a1']); assert.match(text(renderBell()), /Full message/);
  state.readIds.add('a1'); state.unread = 0;
  assert.ok(nodes(renderBell()).some(n => n.props?.accessibilityLabel === 'Open notifications, 0 unread'));
  console.log('PASS: bell opens inbox without marking all read; opening a card reads the correct announcement and shows full message.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
