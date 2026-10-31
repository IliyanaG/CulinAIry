import type { Recipe } from '../types/recipe'
import { generatedRecipeImageUrl } from '../data/recipeTemplates'

const FAVORITES_KEY = 'culinairy:favorites'

type StoredRecipe = Omit<Recipe, 'imageUrl'> & { imageUrl?: string }

function isRecipe(value: unknown): value is StoredRecipe {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<Recipe>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.prepTimeMinutes === 'number' &&
    typeof candidate.servings === 'number' &&
    (candidate.difficulty === 'Easy' || candidate.difficulty === 'Medium') &&
    Array.isArray(candidate.ingredients) &&
    candidate.ingredients.every(
      (ingredient) =>
        typeof ingredient === 'object' &&
        ingredient !== null &&
        typeof ingredient.amount === 'string' &&
        typeof ingredient.name === 'string',
    ) &&
    Array.isArray(candidate.instructions) &&
    candidate.instructions.every((step) => typeof step === 'string') &&
    (candidate.imageUrl === undefined ||
      typeof candidate.imageUrl === 'string') &&
    Array.isArray(candidate.matchedIngredients) &&
    candidate.matchedIngredients.every(
      (ingredient) => typeof ingredient === 'string',
    )
  )
}

export function readFavoriteRecipes(): {
  recipes: Recipe[]
  error: string | null
} {
  let stored: string | null

  try {
    stored = window.localStorage.getItem(FAVORITES_KEY)
  } catch {
    return {
      recipes: [],
      error: 'Browser storage is unavailable. Favorites will only last for this visit.',
    }
  }

  if (stored === null) return { recipes: [], error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return {
      recipes: [],
      error: 'Saved favorites could not be read. You can still save recipes for this visit.',
    }
  }

  if (!Array.isArray(parsed) || !parsed.every(isRecipe)) {
    return {
      recipes: [],
      error: 'Saved favorites have an unexpected format. You can still save recipes for this visit.',
    }
  }

  return {
    recipes: parsed.map((recipe) => ({
      ...recipe,
      imageUrl: recipe.imageUrl || generatedRecipeImageUrl,
    })),
    error: null,
  }
}

export function writeFavoriteRecipes(recipes: Recipe[]): string | null {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(recipes))
    return null
  } catch {
    return 'Favorites could not be saved to browser storage. They will only last for this visit.'
  }
}
