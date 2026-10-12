export interface IngredientObject {
  name?: string;
  amount?: string | number;
  unit?: string;
}

export function formatIngredients(ingredients: unknown): string {
  if (!Array.isArray(ingredients)) {
    return typeof ingredients === 'string' ? ingredients.trim() : '';
  }

  return ingredients
    .map((ingredient: unknown) => {
      if (typeof ingredient === 'string') return ingredient.trim();
      if (!ingredient || typeof ingredient !== 'object') return '';

      const { name, amount, unit } = ingredient as IngredientObject;
      return [amount, unit, name]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ');
    })
    .filter(Boolean)
    .join(', ');
}
