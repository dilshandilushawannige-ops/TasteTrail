const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
function load(file, modules, globals = {}) {
  const code = transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false,
    presets: [['@babel/preset-typescript', { allExtensions: true, isTSX: file.endsWith('.tsx') }]],
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {};
  vm.runInNewContext(code, { exports, Date, Error, ...globals, require: name => {
    assert.ok(name in modules, `Unexpected import: ${name}`); return modules[name];
  } });
  return exports;
}
class Timestamp { constructor(value) { this.value = value; } toMillis() { return this.value; } }
let claims = { admin: true }, writes = [], exists = true, record = {}, denied = false;
const auth = { currentUser: { uid: 'admin', getIdTokenResult: async () => ({ claims }) } };
const service = load('src/services/userBlockService.ts', {
  '@/firebaseConfig': { auth, db: {} },
  'firebase/firestore': {
    Timestamp, doc: (_db, collection, id) => ({ collection, id }), serverTimestamp: () => 'SERVER_TIME',
    runTransaction: async (_db, callback) => callback({
      get: async () => ({ exists: () => exists, data: () => record }),
      update: (ref, data) => { if (denied) throw new Error('permission-denied'); writes.push({ ref, data }); },
    }),
  },
});
const jsx = (type, props) => ({ type, props });
function hooks() {
  let slots = [], cursor = 0, effects = [];
  return {
    react: {
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
        return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useRef: initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useEffect: effect => { effects.push(effect); },
    },
    reset() { cursor = 0; effects = []; }, runEffects() { return effects.map(effect => effect()); },
  };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]; }
function text(tree) { return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : Array.isArray(tree) ? tree.map(text).join('') : text(tree?.props?.children || ''); }
const native = {
  ...Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ActivityIndicator', 'FlatList', 'Modal', 'Pressable', 'ScrollView', 'TextInput'].map(n => [n, n])),
  StyleSheet: { create: styles => styles }, AppState: { addEventListener: () => ({ remove() {} }) },
};
async function main() {
  for (const days of [7, 30]) {
    const started = new Timestamp(1000);
    assert.equal(service.blockExpiry({ blockedAt: started, blockDurationDays: days }), 1000 + days * 86400000);
    await service.blockUser('user1', days);
    const written = writes.at(-1);
    assert.equal(written.ref.id, 'user1'); assert.equal(written.data.blockDurationDays, days);
    assert.equal(written.data.blockedAt, 'SERVER_TIME'); assert.equal(written.data.blockedBy, 'admin');
    assert.equal(Object.keys(written.data).length, 3);
  }
  assert.equal(service.blockExpiry({}), null);
  await assert.rejects(service.blockUser('admin', 7), /own account/);
  await assert.rejects(service.blockUser('user1', 1), /one week or one month/);
  claims = {}; await assert.rejects(service.blockUser('user1', 7), /Only admins/); claims = { admin: true };
  exists = false; await assert.rejects(service.blockUser('missing', 7), /no longer exists/); exists = true;
  record = { blockedAt: new Timestamp(Date.now()), blockDurationDays: 7 };
  await assert.rejects(service.blockUser('user1', 30), /already blocked/);
  record = { blockedAt: new Timestamp(Date.now() - 8 * 86400000), blockDurationDays: 7 };
  await service.blockUser('user1', 30);
  denied = true; await assert.rejects(service.blockUser('user1', 7), /permission-denied/);
  console.log('PASS: server-timestamp blocks for 7/30 days; only block fields written; self/non-admin/invalid/missing/already-blocked requests rejected; failed writes propagated.');
  await assert.rejects(service.unblockUser('user1'), /permission-denied/); denied = false;
  claims = {}; await assert.rejects(service.unblockUser('user1'), /Only admins/); claims = { admin: true };
  await assert.rejects(service.unblockUser('admin'), /own account/);
  exists = false; await assert.rejects(service.unblockUser('missing'), /no longer exists/); exists = true;
  await service.unblockUser('user1');
  const cleared = writes.at(-1);
  assert.equal(cleared.ref.id, 'user1'); assert.equal(cleared.data.blockedAt, null);
  assert.equal(cleared.data.blockDurationDays, 0); assert.equal(cleared.data.blockedBy, 'admin');
  assert.equal(Object.keys(cleared.data).length, 3); assert.equal(service.blockExpiry(cleared.data), null);
  console.log('PASS: admin-only unblock clears only block fields; self/non-admin/missing requests and failed writes rejected.');

  const gateHooks = hooks(); let profileCallback, profileError, clockTick;
  const Gate = load('src/components/AccountBlockGate.tsx', {
    react: gateHooks.react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    '@/firebaseConfig': { auth, db: {} }, '@/services/userBlockService': service,
    'firebase/auth': { onAuthStateChanged: (_auth, callback) => { callback(auth.currentUser); return () => {}; }, signOut: async () => {} },
    'firebase/firestore': { doc: () => ({}), onSnapshot: (_ref, callback, error) => { profileCallback = callback; profileError = error; return () => {}; } },
  }, { setInterval: callback => { clockTick = callback; return 1; }, clearInterval() {} }).default;
  const renderGate = () => { gateHooks.reset(); return Gate({ children: 'APP_CONTENT' }); };
  renderGate(); gateHooks.runEffects();
  profileCallback({ data: () => ({ blockedAt: new Timestamp(Date.now()), blockDurationDays: 7 }) });
  assert.match(text(renderGate()), /Account temporarily blocked/); assert.ok(!text(renderGate()).includes('APP_CONTENT'));
  profileCallback({ data: () => cleared.data });
  assert.equal(renderGate(), 'APP_CONTENT');
  profileCallback({ data: () => ({ blockedAt: new Timestamp(Date.now() - 8 * 86400000), blockDurationDays: 7 }) });
  clockTick(); assert.equal(renderGate(), 'APP_CONTENT');
  profileError(); assert.match(text(renderGate()), /Could not check account access/);
  console.log('PASS: blocked users cannot see app content; expiry restores access; access-check failure shows retry.');

  const uiHooks = hooks(); let pendingResolve, uiCalls = [], unblockFails = true, usersCallback;
  const fixtures = [
    { id: 'user1', data: () => ({ name: 'Member', email: 'member@example.com' }) },
    { id: 'blocked1', data: () => ({ name: 'Z Blocked', email: 'blocked@example.com', blockedAt: new Timestamp(Date.now()), blockDurationDays: 7 }) },
    { id: 'expired1', data: () => ({ name: 'Z Expired', blockedAt: new Timestamp(Date.now() - 8 * 86400000), blockDurationDays: 7 }) },
  ];
  const Screen = load('src/app/admin/users.tsx', {
    react: uiHooks.react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    '@/firebaseConfig': { auth, db: {} }, '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-router': { Tabs: { Screen: 'TabsScreen' } }, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) },
    'firebase/auth': { onAuthStateChanged: (_auth, callback) => { callback(auth.currentUser); return () => {}; } },
    'firebase/firestore': { Timestamp, collection: () => ({}), onSnapshot: (_ref, callback) => {
      usersCallback = callback; callback({ docs: fixtures }); return () => {};
    } },
    '@/services/userBlockService': {
      blockExpiry: service.blockExpiry,
      blockUser: (id, days) => { uiCalls.push({ id, days }); return new Promise(resolve => { pendingResolve = resolve; }); },
      unblockUser: id => {
        uiCalls.push({ id, unblock: true });
        if (unblockFails) return Promise.reject(new Error('Unblock failed. Please retry.'));
        return new Promise(resolve => { pendingResolve = resolve; });
      },
    },
  }, { setInterval: () => 1, clearInterval() {} }).default;
  const renderScreen = () => { uiHooks.reset(); return Screen(); };
  renderScreen(); uiHooks.runEffects(); await new Promise(resolve => setImmediate(resolve));
  let tree = renderScreen();
  const list = nodes(tree).find(n => n.type === 'FlatList');
  const card = list.props.renderItem({ item: list.props.data[0] });
  assert.ok(!text(card).includes('Remove'));
  nodes(card).find(n => n.props?.accessibilityLabel === 'Block Member').props.onPress(); tree = renderScreen();
  const dialog = () => nodes(renderScreen()).find(n => n.type === 'Modal' && n.props.visible);
  assert.match(text(dialog()), /1 week/); assert.match(text(dialog()), /1 month \(30 days\)/);
  nodes(dialog()).find(n => n.props?.accessibilityRole === 'radio' && text(n) === '1 month (30 days)').props.onPress();
  const confirm = nodes(dialog()).find(n => n.type === 'TouchableOpacity' && text(n) === 'Block user');
  const pending = confirm.props.onPress(); await confirm.props.onPress();
  assert.deepEqual(uiCalls, [{ id: 'user1', days: 30 }]); pendingResolve(); await pending;
  assert.ok(!nodes(renderScreen()).some(n => n.type === 'Modal' && n.props.visible));
  console.log('PASS: Delete removed; both durations offered; selected user and duration submitted once; dialog closes after success.');
  const blockedCard = list.props.renderItem({ item: { ...list.props.data[0], blockedUntil: Date.now() + 86400000 } });
  const unblockButton = nodes(blockedCard).find(n => n.props?.accessibilityLabel === 'Unblock Member');
  assert.equal(unblockButton.props.disabled, false); unblockButton.props.onPress();
  assert.match(text(dialog()), /Restore this user's access now/);
  assert.equal(nodes(dialog()).filter(n => n.props?.accessibilityRole === 'radio').length, 0);
  const findUnblock = () => nodes(dialog()).find(n => n.type === 'TouchableOpacity' && text(n) === 'Unblock user');
  await findUnblock().props.onPress(); assert.match(text(dialog()), /Unblock failed/);
  unblockFails = false; const unblockConfirm = findUnblock();
  const saving = unblockConfirm.props.onPress(); await unblockConfirm.props.onPress();
  assert.equal(uiCalls.filter(call => call.unblock).length, 2);
  assert.equal(uiCalls.at(-1).id, 'user1'); pendingResolve(); await saving;
  assert.ok(!nodes(renderScreen()).some(n => n.type === 'Modal' && n.props.visible));
  console.log('PASS: blocked card has Unblock; confirmation omits duration choices; failed unblock permits retry; duplicate clicks prevented.');
  const blockedFilter = nodes(renderScreen()).find(n => n.props?.accessibilityLabel === 'Show blocked users');
  assert.equal(text(blockedFilter), 'Blocked1'); blockedFilter.props.onPress();
  const currentList = () => nodes(renderScreen()).find(n => n.type === 'FlatList');
  assert.equal(currentList().props.data.length, 1); assert.equal(currentList().props.data[0].id, 'blocked1');
  nodes(renderScreen()).find(n => n.props?.accessibilityLabel === 'Search registered users').props.onChangeText('missing-name');
  assert.equal(currentList().props.data.length, 0);
  nodes(renderScreen()).find(n => n.props?.accessibilityLabel === 'Search registered users').props.onChangeText('');
  assert.equal(currentList().props.data.length, 1);
  usersCallback({ docs: [fixtures[0], { id: 'blocked1', data: () => ({ name: 'Z Blocked', blockedAt: null, blockDurationDays: 0 }) }, fixtures[2]] });
  assert.equal(currentList().props.data.length, 0); assert.match(text(currentList().props.ListEmptyComponent), /No blocked users/);
  nodes(renderScreen()).find(n => n.props?.accessibilityLabel === 'Show all registered users').props.onPress();
  assert.equal(currentList().props.data.length, 3);
  console.log('PASS: Blocked filter counts only active blocks; expired blocks excluded; search combines with filter; live unblocking removes cards; All Users restores full list.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
