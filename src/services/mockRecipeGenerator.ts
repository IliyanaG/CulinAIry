import { recipeTemplates } from '../data/recipeTemplates'
import type { RecipeGenerationResult, TimeFilter } from '../types/recipe'

const ingredientAliases: Record<string, string> = {
  tomatoes: 'tomato',
  chickpeas: 'chickpea',
  eggs: 'egg',
  mushrooms: 'mushroom',
  onions: 'onion',
  lemons: 'lemon',
  'chicken breast': 'chicken',
  'chicken thighs': 'chicken',
}

export function normalizeIngredient(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ')
  return ingredientAliases[normalized] ?? normalized
}

export function isWithinTimeFilter(
  prepTimeMinutes: number,
  filter: TimeFilter,
): boolean {
  if (filter === 'fast') return prepTimeMinutes < 15
  if (filter === 'medium') return prepTimeMinutes < 30
  return true
}

export function selectRecipe(
  ingredients: string[],
  timeFilter: TimeFilter,
): RecipeGenerationResult {
  const availableIngredients = new Set(
    ingredients.map(normalizeIngredient).filter(Boolean),
  )

  if (availableIngredients.size === 0) {
    return {
      status: 'empty',
      message: 'Add at least one ingredient to get your recipe started.',
    }
  }

  const candidates = recipeTemplates
    .filter((recipe) => isWithinTimeFilter(recipe.prepTimeMinutes, timeFilter))
    .map((recipe) => ({
      recipe,
      matchedIngredients: recipe.ingredients
        .map((ingredient) => normalizeIngredient(ingredient.name))
        .filter((ingredient) => availableIngredients.has(ingredient)),
    }))
    .filter((candidate) => candidate.matchedIngredients.length > 0)
    .sort(
      (left, right) =>
        right.matchedIngredients.length - left.matchedIngredients.length ||
        left.recipe.prepTimeMinutes - right.recipe.prepTimeMinutes,
    )

  const bestMatch = candidates[0]
  if (!bestMatch) {
    return {
      status: 'no-match',
      message: 'Try another ingredient or a longer time filter. We couldn’t find a close match in this little recipe collection.',
    }
  }

  return {
    status: 'success',
    recipe: {
      ...bestMatch.recipe,
      matchedIngredients: bestMatch.matchedIngredients,
    },
  }
}

export async function generateRecipe(
  ingredients: string[],
  timeFilter: TimeFilter,
): Promise<RecipeGenerationResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 500))
  return selectRecipe(ingredients, timeFilter)
}
