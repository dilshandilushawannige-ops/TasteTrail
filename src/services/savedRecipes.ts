import { db } from '@/firebaseConfig';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

export type SavedRecipe = {
  id: string;
  name: string;
  creator: string;
  region: string;
  type: 'video' | 'recipe';
  duration: string;
  image: string;
  note: string;
};

function bookmarkRef(userId: string, recipeId: string) {
  if (!userId || !recipeId || recipeId.includes('/')) {
    throw new Error('A valid user and recipe ID are required.');
  }

  return doc(db, 'users', userId, 'savedRecipes', recipeId);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

// CREATE: bookmark an existing recipe.
// We copy its display information so the saved list loads directly.
// Cooking Mode will load the original recipe using its ID.
export async function saveRecipe(
  userId: string,
  recipeId: string
) {
  const target = bookmarkRef(userId, recipeId);

  const recipeSnapshot = await getDoc(
    doc(db, 'recipes', recipeId)
  );

  if (!recipeSnapshot.exists()) {
    throw new Error('No recipe was found with that ID.');
  }

  const recipe = recipeSnapshot.data();

  const bookmark = {
    name: text(recipe.name, 'Untitled recipe'),
    creator: recipe.creditPublicly
      ? text(recipe.createdByName, 'Recipe contributor')
      : 'Recipe contributor',
    region: text(recipe.region),
    type: recipe.type === 'video' ? 'video' : 'recipe',
    duration: text(recipe.duration),
    image: text(recipe.imageUrl, text(recipe.image)),
    note: '',
  };

  // Using recipeId as the document ID prevents duplicates.
  // The transaction preserves an existing bookmark's note.
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(target);

    if (!existing.exists()) {
      transaction.set(target, {
        ...bookmark,
        savedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

// READ: listen for changes to this user's saved recipes.
export function watchSavedRecipes(
  userId: string,
  onChange: (recipes: SavedRecipe[]) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    collection(db, 'users', userId, 'savedRecipes'),
    (snapshot) => {
      const recipes = snapshot.docs.map((item) => {
        const data = item.data();

        const recipe: SavedRecipe = {
          id: item.id,
          name: text(data.name, 'Untitled recipe'),
          creator: text(data.creator, 'Recipe contributor'),
          region: text(data.region),
          type: data.type === 'video' ? 'video' : 'recipe',
          duration: text(data.duration),
          image: text(data.image),
          note: text(data.note),
        };

        return recipe;
      });

      onChange(recipes);
    },
    onError
  );
}

// UPDATE: change only the user's personal note.
export async function updateRecipeNote(
  userId: string,
  recipeId: string,
  note: string
) {
  if (note.length > 500) {
    throw new Error('Keep your note within 500 characters.');
  }

  await updateDoc(bookmarkRef(userId, recipeId), {
    note: note.trim(),
    updatedAt: serverTimestamp(),
  });
}

// DELETE: remove the bookmark, not the original recipe.
export async function deleteSavedRecipe(
  userId: string,
  recipeId: string
) {
  await deleteDoc(bookmarkRef(userId, recipeId));
}

// Restore the last removed bookmark, including its note.
export async function restoreSavedRecipe(
  userId: string,
  recipe: SavedRecipe
) {
  const target = bookmarkRef(userId, recipe.id);
  const { id, ...data } = recipe;

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(target);

    if (!existing.exists()) {
      transaction.set(target, {
        ...data,
        savedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });
}