import {
  generatedRecipeImageUrl,
  recipeTemplates,
} from '../data/recipeTemplates'
import type { Recipe, RecipeIngredient, RecipeGenerationResult, TimeFilter } from '../types/recipe'
import { withBaseQuantity } from '../utils/ingredientScaling'

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

function getGeneratedRecipeStyle(ingredients: string[]): {
  title: string
  description: string
  instructions: (ingredientNames: string) => string[]
} {
  const normalized = new Set(ingredients.map(normalizeIngredient))
  const includesAny = (...names: string[]) =>
    names.some((name) => normalized.has(name))

  if (includesAny('pasta', 'noodle', 'spaghetti')) {
    return {
      title: 'Silky Pantry Pasta',
      description: 'A simple pasta supper, tossed until glossy and full of flavor.',
      instructions: (ingredientNames) => [
        `Bring a pot of salted water to a boil and cook the pasta until just tender.`,
        'Warm olive oil and minced garlic in a pan over gentle heat.',
        `Add ${ingredientNames} and a splash of pasta water; toss until everything is tender and coated.`,
        'Season with salt & pepper, finish with lemon, and serve warm.',
      ],
    }
  }

  if (includesAny('rice')) {
    return {
      title: 'Comforting Pantry Rice Bowl',
      description: 'A satisfying rice bowl layered with your ingredients and bright, simple seasoning.',
      instructions: (ingredientNames) => [
        'Cook the rice in lightly salted water until tender and fluffy.',
        'Warm olive oil and minced garlic in a pan over medium heat.',
        `Add ${ingredientNames} and cook until tender and safely cooked through.`,
        'Spoon everything over the rice, then finish with lemon and seasoning.',
      ],
    }
  }

  if (includesAny('bread', 'tortilla', 'wrap', 'flatbread')) {
    return {
      title: 'Golden Pantry Toast',
      description: 'A crisp, comforting toast piled with your ingredients and a fresh finish.',
      instructions: (ingredientNames) => [
        'Toast the bread or warm the flatbread until crisp at the edges.',
        'Warm olive oil and minced garlic in a pan over medium heat.',
        `Add ${ingredientNames} and cook until tender and safely cooked through.`,
        'Pile the warm filling onto the toast, season, and finish with lemon.',
      ],
    }
  }

  const styles = [
    {
      title: 'Cozy Pantry Soup',
      description: 'A comforting, gently simmered soup that brings your ingredients together.',
      instructions: (ingredientNames: string) => [
        `Wash and prepare ${ingredientNames}, cutting larger pieces evenly.`,
        'Warm olive oil in a saucepan and stir in the minced garlic until fragrant.',
        `Add ${ingredientNames} with enough water or stock to cover; simmer until tender and safely cooked.`,
        'Season with salt & pepper, finish with lemon, and serve in warm bowls.',
      ],
    },
    {
      title: 'Rustic Oven-Roasted Tray',
      description: 'A colorful oven-roasted dinner with golden edges and a bright finish.',
      instructions: (ingredientNames: string) => [
        `Heat the oven to 220°C and prepare ${ingredientNames} in even-sized pieces.`,
        'Spread everything on a baking tray, drizzle with olive oil, and season well.',
        'Roast until tender and golden at the edges, turning once as it cooks.',
        'Finish with minced garlic and lemon, then serve straight from the tray.',
      ],
    },
    {
      title: 'Bright Chopped Salad',
      description: 'A fresh, colorful salad tossed with lemon, herbs, and a little olive oil.',
      instructions: (ingredientNames: string) => [
        `Wash and prepare ${ingredientNames}, cutting everything into bite-sized pieces.`,
        'Whisk olive oil, lemon, minced garlic, salt, and pepper in a serving bowl.',
        `Add ${ingredientNames} and toss gently until everything is well coated.`,
        'Taste, adjust the seasoning, and let the flavors mingle before serving.',
      ],
    },
    {
      title: 'Savory Garlic Sauté',
      description: 'A quick, golden sauté with tender ingredients and fragrant garlic.',
      instructions: (ingredientNames: string) => [
        `Wash and prepare ${ingredientNames}, cutting larger pieces evenly.`,
        'Warm olive oil in a wide pan and stir in minced garlic until fragrant.',
        `Add ${ingredientNames} and cook, stirring, until tender and safely cooked through.`,
        'Season with salt & pepper, finish with lemon, and serve warm.',
      ],
    },
    {
      title: 'Slow-Simmered Pantry Stew',
      description: 'A hearty, savory stew with soft, comforting ingredients and a lemony finish.',
      instructions: (ingredientNames: string) => [
        `Wash and prepare ${ingredientNames}, cutting larger pieces evenly.`,
        'Warm olive oil in a saucepan and cook minced garlic until fragrant.',
        `Add ${ingredientNames} and enough water or stock for a thick stew; simmer until tender and safely cooked.`,
        'Season to taste, finish with lemon, and ladle into bowls.',
      ],
    },
  ]

  const needsThoroughCooking = includesAny(
    'chicken',
    'turkey',
    'beef',
    'pork',
    'lamb',
    'sausage',
    'fish',
    'salmon',
    'shrimp',
    'prawn',
    'tuna',
    'egg',
  )
  const availableStyles = needsThoroughCooking
    ? styles.filter((style) => style.title !== 'Bright Chopped Salad')
    : styles
  const index =
    Number.parseInt(hashIngredients(ingredients), 36) % availableStyles.length
  return availableStyles[index]
}

function getGeneratedIngredientAmount(name: string): string {
  const ingredient = normalizeIngredient(name)

  if (/\begg\b/.test(ingredient)) return '1'
  if (
    /\b(chicken|turkey|beef|pork|lamb|fish|salmon|shrimp|prawn|tuna|tofu)\b/.test(
      ingredient,
    )
  ) {
    return '150 g'
  }
  if (/\b(pasta|noodle|spaghetti|rice|lentil|chickpea|bean)\b/.test(ingredient)) {
    return '75 g'
  }
  return '1 cup'
}

function createGeneratedRecipe(
  ingredients: string[],
  timeFilter: TimeFilter,
): Recipe {
  const [first, second] = ingredients
  const style = getGeneratedRecipeStyle(ingredients)
  const ingredientTitle = second
    ? `${titleCase(first)} & ${titleCase(second)}`
    : titleCase(first)
  const title = `${style.title}: ${ingredientTitle}`
  const normalizedInputs = new Set(ingredients.map(normalizeIngredient))
  const userIngredients = ingredients.map(
    (name): RecipeIngredient =>
      withBaseQuantity({ amount: getGeneratedIngredientAmount(name), name }),
  )
  const essentials = generatedEssentials
    .filter((ingredient) => !normalizedInputs.has(normalizeIngredient(ingredient.name)))
    .slice(0, 4)
    .map(withBaseQuantity)
  const ingredientNames = ingredients.join(', ')
  const prepTimeMinutes =
    timeFilter === 'fast' ? 12 : timeFilter === 'medium' ? 22 : 32

  return {
    id: `generated-${hashIngredients(ingredients)}`,
    title,
    description: `${style.description} Built around ${ingredientNames}, with bright aromatics and a simple finish.`,
    prepTimeMinutes,
    servings: 2,
    baseServings: 2,
    difficulty: prepTimeMinutes < 15 ? 'Easy' : 'Medium',
    ingredients: [...userIngredients, ...essentials],
    instructions: style.instructions(ingredientNames),
    imageUrl: generatedRecipeImageUrl,
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
