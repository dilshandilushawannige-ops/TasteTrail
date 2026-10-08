const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
function load(file, modules) {
  const code = transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false,
    presets: [['@babel/preset-typescript', { allExtensions: true, isTSX: file.endsWith('.tsx') }]],
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {};
  vm.runInNewContext(code, { exports, Error, require: name => {
    assert.ok(name in modules, `Unexpected import: ${name}`); return modules[name];
  } });
  return exports;
}
const review = {
  id: 'restaurant_u1', restaurantId: 'restaurant', userId: 'u1', userName: 'Kasun Perera',
  rating: 2, comment: 'The meal could have been better.', createdAt: new Date(),
  diningType: 'Dine-in', mealTime: 'Lunch', visitedWith: 'Family', anonymous: false,
  media: [{ url: 'https://res.cloudinary.com/test/existing.jpg', type: 'image' }],
  helpfulUserIds: ['u2'],
};
const auth = { currentUser: { uid: 'u1', displayName: 'Kasun Perera', photoURL: null } };
const records = new Map([[review.id, { ...review }]]);
let writes = 0;
const service = load('src/services/reviewService.ts', {
  '@/firebaseConfig': { auth, db: {} },
  'firebase/firestore': {
    doc: (_db, collection, id) => ({ collection, id }),
    getDoc: async () => ({ data: () => ({ name: 'Kasun Perera' }) }),
    serverTimestamp: () => 'server-time',
    runTransaction: async (_db, callback) => callback({
      get: async ref => ({ exists: () => records.has(ref.id), data: () => records.get(ref.id) }),
      update: (ref, changes) => { writes++; records.set(ref.id, { ...records.get(ref.id), ...changes }); },
    }),
  },
});
function fakeReact() {
  let slots = [], index = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect: () => {},
  };
  return { React, reset: () => { index = 0; }, clear: () => { slots = []; index = 0; } };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]; }
function text(tree) { return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : Array.isArray(tree) ? tree.map(text).join('') : text(tree?.props?.children || ''); }
const find = (tree, label) => nodes(tree).find(node => node.type === 'TouchableOpacity' && (node.props.accessibilityLabel === label || text(node) === label));
const native = {
  ...Object.fromEntries(['View', 'Text', 'Image', 'TouchableOpacity', 'Modal', 'TextInput', 'KeyboardAvoidingView', 'ScrollView'].map(name => [name, name])),
  Platform: { OS: 'web' }, StyleSheet: { create: styles => styles }, Alert: { alert() {} },
};
async function main() {
  await service.updateReview(review.id, { rating: 4, comment: 'The updated experience was much better.', diningType: 'Takeaway', media: [] });
  const updated = records.get(review.id);
  assert.equal(updated.rating, 4); assert.equal(updated.diningType, 'Takeaway'); assert.equal(updated.media.length, 0);
  assert.equal(updated.createdAt, review.createdAt); assert.equal(updated.userId, 'u1');
  assert.deepEqual(updated.helpfulUserIds, ['u2']); assert.equal(updated.updatedAt, 'server-time');
  auth.currentUser.uid = 'u2';
  await assert.rejects(service.updateReview(review.id, { rating: 5 }), /only update your own/);
  assert.equal(writes, 1); auth.currentUser.uid = 'u1';
  await assert.rejects(service.updateReview('missing', { rating: 5 }), /no longer available/);
  await assert.rejects(service.updateReview(review.id, { rating: 0 }), /Select a rating/);
  await assert.rejects(service.updateReview(review.id, { media: [{ url: 'file:///bad.jpg', type: 'image' }] }), /upload/);
  console.log('PASS: author-only update saves the same review and preserves creation date and helpful votes; invalid updates rejected');

  const hooks = fakeReact(); let uploads = 0, closes = 0, payload;
  const { WriteReviewSheet } = load('src/components/reviews/WriteReviewSheet.tsx', {
    react: { __esModule: true, default: hooks.React, ...hooks.React }, 'react-native': native,
    '@expo/vector-icons': { Ionicons: 'Icon' }, '@/firebaseConfig': { auth },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'expo-image-picker': { launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'file:///new.jpg', type: 'image', width: 20, height: 20 }] }) },
    '@/services/reviewMediaService': { uploadReviewMedia: async () => { uploads++; return { url: 'https://res.cloudinary.com/test/new.jpg', type: 'image' }; } },
  });
  const props = { visible: true, initialReview: review, restaurantId: review.restaurantId, restaurantName: 'Restaurant', onClose: () => closes++ };
  let fail = true;
  const render = () => { hooks.reset(); return WriteReviewSheet({ ...props, onSubmit: async data => { payload = data; if (fail) throw new Error('Update failed'); } }); };
  let form = render();
  assert.equal(nodes(form).find(node => node.type === 'TextInput').props.value, review.comment);
  assert.match(text(form), /2.0 - Fair/); assert.ok(nodes(form).some(node => node.type === 'Image' && node.props.source.uri === review.media[0].url));
  assert.equal(find(form, 'Save as Draft'), undefined);
  nodes(form).find(node => node.type === 'TextInput').props.onChangeText('Updated review with a new photo.');
  await find(form, 'Add photos or videos').props.onPress(); form = render();
  await find(form, 'Update Review').props.onPress(); form = render();
  assert.match(text(form), /Update failed/); assert.equal(closes, 0); assert.equal(uploads, 1);
  assert.equal(nodes(form).find(node => node.type === 'TextInput').props.value, 'Updated review with a new photo.');
  fail = false; await find(form, 'Update Review').props.onPress();
  assert.equal(closes, 1); assert.equal(uploads, 1); assert.equal(payload.media.length, 2);
  assert.equal(payload.media[0].url, review.media[0].url);
  console.log('PASS: editor prefilled; existing media reused; new media uploaded once; failed save preserves edits for retry');

  hooks.clear();
  const deletedIds = [];
  let deleteFails = true;
  const { ReviewCard } = load('src/components/reviews/ReviewCard.tsx', {
    react: { __esModule: true, default: hooks.React, ...hooks.React }, 'react-native': native,
    '@expo/vector-icons': { Ionicons: 'Icon' }, '@/firebaseConfig': { auth },
    '@/services/reviewService': {
      deleteReview: async id => { deletedIds.push(id); if (deleteFails) throw new Error('Delete failed'); },
      reviewErrorMessage: error => error.message,
    }, './WriteReviewSheet': { WriteReviewSheet: 'ReviewEditor' },
  });
  const renderCard = () => { hooks.reset(); return ReviewCard({ review }); };
  let card = renderCard(); find(card, 'Review options').props.onPress(); card = renderCard();
  assert.ok(find(card, 'Update your review')); assert.ok(find(card, 'Delete your review')); assert.doesNotMatch(text(card), /Cancel/);
  const controls = nodes(card).filter(node => node.type === 'TouchableOpacity' && ['Update your review', 'Delete your review'].includes(node.props.accessibilityLabel));
  assert.deepEqual(controls.map(node => node.props.accessibilityLabel), ['Update your review', 'Delete your review']);
  await find(card, 'Delete your review').props.onPress(); card = renderCard();
  assert.match(text(card), /Delete failed/); assert.deepEqual(deletedIds, [review.id]);
  deleteFails = false;
  await find(card, 'Delete your review').props.onPress(); card = renderCard();
  assert.deepEqual(deletedIds, [review.id, review.id]); assert.doesNotMatch(text(card), /Delete failed/);
  find(card, 'Update your review').props.onPress(); card = renderCard();
  assert.equal(nodes(card).find(node => node.type === 'ReviewEditor').props.initialReview, review);
  auth.currentUser.uid = 'u2'; card = renderCard();
  assert.equal(find(card, 'Review options'), undefined); assert.equal(nodes(card).find(node => node.type === 'ReviewEditor'), undefined);
  assert.equal(find(card, 'Delete your review'), undefined);
  console.log('PASS: Delete appears to the right of Update, deletes the correct review, allows retry on failure, and is available only to the author');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
