import { db } from '@/firebaseConfig';
import {
  deleteDoc,
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

export type CookingRecipe = {
  id: string;
  name: string;
  ingredients: string;
  steps: string[];
  /** Cloudinary (or other) URL for the recipe photo. Optional — older records omit it. */
  imageUrl?: string;
};

export type CookingSession = {
  recipe: CookingRecipe;
  currentStepIndex: number;
  completedStepIndexes: number[];
  status: 'in_progress' | 'completed';
  timerEndAt: number | null;
  timerRemainingSeconds: number;
  version: number;
};

export type SessionChanges = Partial<
  Pick<
    CookingSession,
    | 'currentStepIndex'
    | 'completedStepIndexes'
    | 'status'
    | 'timerEndAt'
    | 'timerRemainingSeconds'
  >
>;

function sessionRef(userId: string, recipeId: string) {
  if (!userId || !recipeId || recipeId.includes('/')) {
    throw new Error(
      'A signed-in user and valid recipe ID are required.'
    );
  }

  // One session per user per recipe.
  return doc(
    db,
    'users',
    userId,
    'cookingSessions',
    recipeId
  );
}

function parseRecipe(
  id: string,
  data: Record<string, unknown>
): CookingRecipe {
  if (
    !Array.isArray(data.steps) ||
    data.steps.length === 0 ||
    !data.steps.every(
      (step) => typeof step === 'string' && step.trim()
    )
  ) {
    throw new Error(
      'This recipe needs at least one written cooking step.'
    );
  }

  // Accept imageUrl only when it is a non-empty string (Cloudinary URL).
  // null, undefined, empty-string, and other types are silently dropped so
  // that older records and sessions without a photo remain fully compatible.
  const imageUrl =
    typeof data.imageUrl === 'string' && data.imageUrl.trim()
      ? data.imageUrl.trim()
      : undefined;

  return {
    id,
    name:
      typeof data.name === 'string'
        ? data.name
        : 'Recipe',
    ingredients:
      typeof data.ingredients === 'string'
        ? data.ingredients
        : '',
    steps: data.steps as string[],
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  };
}

function parseSession(
  recipeId: string,
  data: Record<string, unknown>
): CookingSession {
  if (!data.recipe || typeof data.recipe !== 'object') {
    throw new Error(
      'This cooking session has an unsupported format.'
    );
  }

  const recipe = parseRecipe(
    recipeId,
    data.recipe as Record<string, unknown>
  );

  const index = data.currentStepIndex;

  if (
    typeof index !== 'number' ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= recipe.steps.length ||
    (
      data.status !== 'in_progress' &&
      data.status !== 'completed'
    ) ||
    typeof data.version !== 'number' ||
    !Number.isInteger(data.version) ||
    !Array.isArray(data.completedStepIndexes) ||
    !data.completedStepIndexes.every(
      (i) =>
        Number.isInteger(i) &&
        i >= 0 &&
        i < recipe.steps.length
    ) ||
    !(
      data.timerEndAt === null ||
      (
        typeof data.timerEndAt === 'number' &&
        Number.isFinite(data.timerEndAt)
      )
    ) ||
    typeof data.timerRemainingSeconds !== 'number' ||
    !Number.isFinite(data.timerRemainingSeconds) ||
    data.timerRemainingSeconds < 0
  ) {
    throw new Error(
      'Saved progress has an unsupported format. Ask your team to review this session.'
    );
  }

  return {
    recipe,
    currentStepIndex: index,
    completedStepIndexes:
      data.completedStepIndexes as number[],
    status: data.status,
    timerEndAt: data.timerEndAt as number | null,
    timerRemainingSeconds: data.timerRemainingSeconds,
    version: data.version,
  };
}

// READ: load existing progress, or load the original recipe.
// Server reads report connection and permission failures.
export async function loadCooking(
  userId: string,
  recipeId: string
) {
  const saved = await getDocFromServer(
    sessionRef(userId, recipeId)
  );

  if (saved.exists()) {
    const session = parseSession(recipeId, saved.data());

    return {
      recipe: session.recipe,
      session,
    };
  }

  const source = await getDocFromServer(
    doc(db, 'recipes', recipeId)
  );

  if (!source.exists()) {
    throw new Error('This recipe no longer exists.');
  }

  return {
    recipe: parseRecipe(recipeId, source.data()),
    session: null,
  };
}

// Serialize a CookingRecipe for Firestore, omitting undefined fields.
// Firestore does not accept `undefined` values; use this helper before any write.
function recipeToFirestore(recipe: CookingRecipe): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: recipe.id,
    name: recipe.name,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
  // Only include imageUrl when it has an actual value to avoid writing undefined.
  if (recipe.imageUrl !== undefined) {
    base.imageUrl = recipe.imageUrl;
  }
  return base;
}

// CREATE: start a session, or return the existing session.
export async function startCooking(
  userId: string,
  recipe: CookingRecipe
) {
  const target = sessionRef(userId, recipe.id);

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(target);

    if (existing.exists()) {
      return parseSession(recipe.id, existing.data());
    }

    const session: CookingSession = {
      recipe,
      currentStepIndex: 0,
      completedStepIndexes: [],
      status: 'in_progress',
      timerEndAt: null,
      timerRemainingSeconds: 300,
      version: 1,
    };

    // Build the Firestore document without any `undefined` values.
    transaction.set(target, {
      ...session,
      recipe: recipeToFirestore(recipe),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return session;
  });
}

// OPTIONAL PHOTO FETCH: try to load only the imageUrl for an existing session
// whose saved snapshot pre-dates photo support. Failures are silently swallowed
// — a missing photo must never prevent an existing session from resuming.
export async function fetchRecipeImageUrl(
  recipeId: string
): Promise<string | undefined> {
  try {
    const snap = await getDocFromServer(doc(db, 'recipes', recipeId));
    if (!snap.exists()) return undefined;
    const raw = snap.data().imageUrl;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
  } catch {
    // Network failure, permission denial, etc. — non-fatal.
    return undefined;
  }
}

// UPDATE: save progress and timer changes.
// Version checking prevents silently overwriting newer progress.
export async function updateCooking(
  userId: string,
  session: CookingSession,
  changes: SessionChanges
) {
  const target = sessionRef(userId, session.recipe.id);

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(target);

    if (!existing.exists()) {
      throw new Error(
        'Session was deleted. Reload this screen.'
      );
    }

    const current = parseSession(
      session.recipe.id,
      existing.data()
    );

    if (current.version !== session.version) {
      throw new Error(
        'Progress changed in another window or device. Tap Reload before continuing.'
      );
    }

    const next = parseSession(session.recipe.id, {
      ...current,
      ...changes,
      version: current.version + 1,
    });

    transaction.update(target, {
      ...next,
      recipe: recipeToFirestore(next.recipe),
      updatedAt: serverTimestamp(),
    });

    return next;
  });
}

// DELETE: remove progress only.
// The original recipe and saved bookmark remain unchanged.
export async function deleteCooking(
  userId: string,
  recipeId: string
) {
  await deleteDoc(sessionRef(userId, recipeId));
}