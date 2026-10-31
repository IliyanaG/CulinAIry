import { getRecipeImageUrl, recipeTemplates } from '../data/recipeTemplates'
import type { Recipe, RecipeIngredient, RecipeGenerationResult, TimeFilter } from '../types/recipe'

const generatedEssentials: RecipeIngredient[] = [
  { amount: '1 tbsp', name: 'Olive oil' },
  { amount: '1 tsp', name: 'Minced garlic' },
  { amount: 'To taste', name: 'Salt & pepper' },
  { amount: '1 wedge', name: 'Lemon' },
  { amount: 'As needed', name: 'Water or stock' },
  { amount: '1 tsp', name: 'Butter' },
]

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

function cleanIngredients(ingredients: string[]): string[] {
  const seen = new Set<string>()
  return ingredients
    .map((ingredient) => ingredient.trim().replace(/\s+/g, ' '))
    .filter((ingredient) => {
      const key = ingredient.toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase())
}

function hashIngredients(ingredients: string[]): string {
  let hash = 2166136261
  for (const character of ingredients.join('|').toLowerCase()) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }
  return (hash >>> 0).toString(36)
}

function createGeneratedRecipe(
  ingredients: string[],
  timeFilter: TimeFilter,
): Recipe {
  const [first, second] = ingredients
  const title = second
    ? `Gourmet ${titleCase(first)} & ${titleCase(second)} Skillet`
    : `Rustic ${titleCase(first)} Medley`
  const normalizedInputs = new Set(ingredients.map(normalizeIngredient))
  const userIngredients = ingredients.map((name): RecipeIngredient => ({
    amount: 'As needed',
    name,
  }))
  const essentials = generatedEssentials
    .filter((ingredient) => !normalizedInputs.has(normalizeIngredient(ingredient.name)))
    .slice(0, 4)
  const ingredientNames = ingredients.join(', ')
  const prepTimeMinutes =
    timeFilter === 'fast' ? 12 : timeFilter === 'medium' ? 22 : 32

  return {
    id: `generated-${hashIngredients(ingredients)}`,
    title,
    description: `A flexible, golden skillet built around ${ingredientNames}, with bright aromatics and a simple, savory finish.`,
    prepTimeMinutes,
    servings: 2,
    difficulty: prepTimeMinutes < 15 ? 'Easy' : 'Medium',
    ingredients: [...userIngredients, ...essentials],
    instructions: [
      `Wash and prepare ${ingredientNames}, cutting larger pieces evenly.`,
      'Warm olive oil in a skillet; stir in minced garlic until fragrant.',
      `Add ${ingredientNames} and cook, stirring, until tender and safely cooked.`,
      'Season with salt & pepper, finish with lemon, and serve warm.',
    ],
    imageUrl: getRecipeImageUrl(title),
    matchedIngredients: ingredients,
  }
}

export function selectRecipe(
  ingredients: string[],
  timeFilter: TimeFilter,
): RecipeGenerationResult {
  const enteredIngredients = cleanIngredients(ingredients)
  const availableIngredients = new Set(enteredIngredients.map(normalizeIngredient))

  if (availableIngredients.size === 0) {
    return {
      status: 'empty',
      message: 'Add at least one ingredient to get your recipe started.',
    }
  }

  const matchingRecipes = recipeTemplates
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

  const bestMatch = matchingRecipes.find(
    (candidate) =>
      candidate.matchedIngredients.length === availableIngredients.size &&
      isWithinTimeFilter(candidate.recipe.prepTimeMinutes, timeFilter),
  )

  return {
    status: 'success',
    recipe: bestMatch
      ? {
          ...bestMatch.recipe,
          matchedIngredients: bestMatch.matchedIngredients,
        }
      : createGeneratedRecipe(enteredIngredients, timeFilter),
  }
}

export async function generateRecipe(
  ingredients: string[],
  timeFilter: TimeFilter,
): Promise<RecipeGenerationResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 500))
  return selectRecipe(ingredients, timeFilter)
}
