import { db } from '@/firebaseConfig';
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
} from 'firebase/firestore';

export type SavedRecipeRecord = {
  id: string;
  savedAt?: unknown;
  createdAt?: unknown;
  [key: string]: unknown;
};

export type ResolvedSavedRecipe = {
  id: string;
  name: string;
  creator: string;
  region: string;
  type: 'video' | 'recipe';
  duration: string;
  image: string;
  note: string;
};

function savedRecipeRef(userId: string, recipeId: string) {
  if (!userId || !recipeId || recipeId.includes('/')) {
    throw new Error('A valid user and recipe ID are required.');
  }
  return doc(db, 'users', userId, 'savedRecipes', recipeId);
}

function recipeIdFromRecord(record: DocumentData, documentIdValue: string) {
  const value = record.recipeId ?? record.id ?? documentIdValue;
  return typeof value === 'string' && value ? value : documentIdValue;
}

function timestampValue(value: unknown) {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return typeof value === 'number' ? value : 0;
}

export async function saveRecipe(recipeId: string, userId?: string) {
  const uid = userId;
  if (!uid) throw new Error('A signed-in user is required.');

  const recipeSnapshot = await getDocs(query(collection(db, 'recipes'), where(documentId(), '==', recipeId)));
  const recipe = recipeSnapshot.docs[0];
  if (!recipe) throw new Error('No recipe was found with that ID.');

  const data = recipe.data();
  await runTransaction(db, async (transaction) => {
    const target = savedRecipeRef(uid, recipeId);
    const existing = await transaction.get(target);
    if (!existing.exists()) {
      transaction.set(target, {
        recipeId,
        name: typeof data.name === 'string' ? data.name : 'Untitled recipe',
        creator: data.creditPublicly ? data.createdByName || 'Recipe contributor' : 'Recipe contributor',
        region: typeof data.region === 'string' ? data.region : '',
        type: data.type === 'video' ? 'video' : 'recipe',
        duration: typeof data.duration === 'string' ? data.duration : '',
        image: typeof data.imageUrl === 'string' ? data.imageUrl : (typeof data.image === 'string' ? data.image : ''),
        note: '',
        savedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function unsaveRecipe(recipeId: string, userId?: string) {
  if (!userId) throw new Error('A signed-in user is required.');
  await deleteDoc(savedRecipeRef(userId, recipeId));
}

export async function toggleSavedRecipe(recipeId: string, saved: boolean, userId?: string) {
  return saved ? unsaveRecipe(recipeId, userId) : saveRecipe(recipeId, userId);
}

export function subscribeToSavedRecipes(
  userId: string,
  callback: (records: SavedRecipeRecord[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(collection(db, 'users', userId, 'savedRecipes'), (snapshot) => {
    const records: SavedRecipeRecord[] = snapshot.docs
      .map((item) => ({ id: recipeIdFromRecord(item.data(), item.id), ...item.data() }) as SavedRecipeRecord)
      .sort((a, b) => timestampValue(b.savedAt ?? b.createdAt) - timestampValue(a.savedAt ?? a.createdAt));
    callback(records);
  }, onError);
}

export async function resolveSavedRecipes(records: SavedRecipeRecord[]): Promise<ResolvedSavedRecipe[]> {
  const resolved: ResolvedSavedRecipe[] = [];
  for (let offset = 0; offset < records.length; offset += 10) {
    const ids = records.slice(offset, offset + 10).map((record) => record.id);
    if (!ids.length) continue;
    const snapshot = await getDocs(query(collection(db, 'recipes'), where(documentId(), 'in', ids)));
    const byId = new Map(snapshot.docs.map((item) => [item.id, { id: item.id, ...item.data() }]));
    for (const record of records.slice(offset, offset + 10)) {
      const recipe = byId.get(record.id);
      if (!recipe) continue;
      const data = recipe as DocumentData;
      if (data.status === 'draft' || data.status === 'unpublished' || data.published === false) continue;
      resolved.push({
        id: record.id,
        name: typeof data.name === 'string' ? data.name : 'Untitled recipe',
        creator: data.creditPublicly ? data.createdByName || 'Recipe contributor' : 'Recipe contributor',
        region: typeof data.region === 'string' ? data.region : '',
        type: data.type === 'video' ? 'video' : 'recipe',
        duration: typeof data.duration === 'string' ? data.duration : '',
        image: typeof data.imageUrl === 'string' ? data.imageUrl : (typeof data.image === 'string' ? data.image : ''),
        note: typeof record.note === 'string' ? record.note : '',
      });
    }
  }
  return resolved;
}
