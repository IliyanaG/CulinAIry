import {
  getGeneratedRecipeImageUrl,
  recipeTemplates,
} from '../data/recipeTemplates.ts'
import type {
  InvalidIngredientsResponse,
  Recipe,
  RecipeIngredient,
  RecipeGenerationResult,
  TimeFilter,
} from '../types/recipe.ts'
import { withBaseQuantity } from '../utils/ingredientScaling.ts'

const generatedEssentials: RecipeIngredient[] = [
  { amount: '1 tbsp', name: 'Olive oil' },
  { amount: '1 tsp', name: 'Minced garlic' },
  { amount: 'To taste', name: 'Salt & pepper' },
  { amount: '1 wedge', name: 'Lemon' },
  { amount: 'As needed', name: 'Water or stock' },
  { amount: '1 tsp', name: 'Butter' },
]

const invalidIngredientsMessage = 'Please enter real and edible food products.'
const knownInedibleIngredients = new Set([
  'камък',
  'камъни',
  'stone',
  'stones',
  'rock',
  'rocks',
  'нож',
  'knife',
  'ножица',
  'ножици',
  'scissors',
  'computer',
  'компютър',
  'компютри',
  'laptop',
  'лаптоп',
  'лаптопи',
  'paper',
  'хартия',
])

export const recipeResponseSchema = {
  type: 'object',
  properties: {
    invalidIngredients: { type: 'boolean' },
    message: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          baseAmount: { type: 'number' },
          unit: { type: 'string' },
        },
        required: ['name', 'baseAmount', 'unit'],
        additionalProperties: false,
      },
    },
    instructions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'invalidIngredients',
    'message',
    'title',
    'description',
    'ingredients',
    'instructions',
  ],
  additionalProperties: false,
} as const satisfies Record<string, unknown>

const recipeResponseKeys = new Set([
  'invalidIngredients',
  'message',
  'title',
  'description',
  'ingredients',
  'instructions',
])

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

export function cleanIngredients(ingredients: string[]): string[] {
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

function containsKnownInedibleIngredient(value: string): boolean {
  const words = value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  return words.some((word) => knownInedibleIngredients.has(word))
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

function getGeneratedRecipeStyle(
  ingredients: string[],
  timeFilter: TimeFilter,
): {
  title: string
  titleIsComplete?: boolean
  description: string
  instructions: (ingredientNames: string) => string[]
} {
  const normalized = new Set(ingredients.map(normalizeIngredient))
  const includesAny = (...names: string[]) =>
    names.some((name) => normalized.has(name))

  if (
    timeFilter === 'medium' &&
    includesAny('salmon') &&
    normalized.has('chickpea') &&
    normalized.has('spinach') &&
    includesAny('bread', 'tortilla', 'wrap', 'flatbread')
  ) {
    return {
      title: 'Warm Salmon & Chickpea Skillet',
      titleIsComplete: true,
      description:
        'Golden-seared salmon and gently simmered chickpeas are folded through tender spinach, with crisp bread on the side.',
      instructions: () => [
        'Drain and rinse the chickpeas. Pat the salmon dry, check it for pin bones, and season both sides with salt and pepper.',
        'Warm olive oil in a skillet over medium heat. Lay in the salmon and sear for 3–4 minutes per side, until opaque and cooked through; transfer it to a plate.',
        'Add the garlic to the same pan and stir for 30 seconds. Add the chickpeas with a splash of water or stock, then simmer for 4–5 minutes so they warm through and take on the pan flavors.',
        'Fold in the spinach a handful at a time and cook just until wilted. Return the salmon to the pan and spoon the chickpeas and greens around it.',
        'Toast the bread until crisp. Finish the skillet with lemon, taste for seasoning, and serve the salmon and warm chickpeas with the toast alongside.',
      ],
    }
  }

  if (
    timeFilter === 'medium' &&
    includesAny('bread', 'tortilla', 'wrap', 'flatbread')
  ) {
    return {
      title: 'Warm Pantry Skillet',
      description:
        'A more substantial, gently simmered skillet filling served with crisp warm bread.',
      instructions: (ingredientNames) => [
        `Prepare ${ingredientNames}, separating ingredients that need longer cooking from tender greens.`,
        'Warm olive oil in a skillet over medium heat. Add the minced garlic and the heartier ingredients, stirring until fragrant and lightly browned.',
        'Add a splash of water or stock, cover, and simmer until the ingredients are tender and any meat or fish is safely cooked through.',
        'Stir in the tender ingredients and cook just until warmed through or wilted. Uncover and let excess liquid reduce to a spoonable pan sauce.',
        'Toast the bread until crisp, then serve alongside the warm skillet. Finish with lemon and adjust the salt and pepper.',
      ],
    }
  }

  if (timeFilter === 'medium') {
    return {
      title: 'Warm Pantry Skillet',
      description:
        'A more substantial, gently simmered skillet that gives heartier ingredients time to turn tender and flavorful.',
      instructions: (ingredientNames) => [
        `Wash and prepare ${ingredientNames}, cutting larger pieces evenly and separating tender greens from heartier ingredients.`,
        'Warm olive oil in a wide skillet over medium heat. Add the minced garlic and the heartier ingredients, stirring until fragrant and lightly browned.',
        'Pour in a splash of water or stock, cover, and simmer gently so the flavors mingle and the ingredients become tender. Cook any meat or fish through safely.',
        'Uncover and stir in tender greens or delicate ingredients. Let the pan sauce reduce for a few minutes, stirring so everything is coated.',
        'Taste and adjust the salt and pepper. Finish with lemon and serve warm, spooning the skillet juices over the top.',
      ],
    }
  }

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
  const style = getGeneratedRecipeStyle(ingredients, timeFilter)
  const ingredientTitle = second
    ? `${titleCase(first)} & ${titleCase(second)}`
    : titleCase(first)
  const title = style.titleIsComplete
    ? style.title
    : `${style.title}: ${ingredientTitle}`
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
    id: `generated-${hashIngredients(ingredients)}-${timeFilter}`,
    title,
    description: `${style.description} Built around ${ingredientNames}, with bright aromatics and a simple finish.`,
    prepTimeMinutes,
    servings: 2,
    baseServings: 2,
    difficulty: prepTimeMinutes < 15 ? 'Easy' : 'Medium',
    ingredients: [...userIngredients, ...essentials],
    instructions: style.instructions(ingredientNames),
    imageUrl: getGeneratedRecipeImageUrl(title),
    matchedIngredients: ingredients,
  }
}

export function selectRecipe(
  ingredients: string[],
  timeFilter: TimeFilter,
): RecipeGenerationResult {
  const cleanedIngredients = cleanIngredients(ingredients)
  if (
    cleanedIngredients.length > 0 &&
    cleanedIngredients.some(containsKnownInedibleIngredient)
  ) {
    return {
      status: 'invalidIngredients',
      invalidIngredients: true,
      message: invalidIngredientsMessage,
    }
  }

  if (cleanedIngredients.length === 0) {
    return {
      status: 'empty',
      message: 'Add at least one ingredient to get your recipe started.',
    }
  }

  const availableIngredients = new Set(cleanedIngredients.map(normalizeIngredient))

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
    source: 'local',
    recipe: bestMatch
      ? {
          ...bestMatch.recipe,
          matchedIngredients: bestMatch.matchedIngredients,
        }
      : createGeneratedRecipe(cleanedIngredients, timeFilter),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isRecipe(value: unknown): value is Recipe {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.prepTimeMinutes === 'number' &&
    Number.isFinite(value.prepTimeMinutes) &&
    typeof value.servings === 'number' &&
    (value.difficulty === 'Easy' || value.difficulty === 'Medium') &&
    Array.isArray(value.ingredients) &&
    value.ingredients.every(
      (ingredient) =>
        isRecord(ingredient) &&
        typeof ingredient.name === 'string' &&
        typeof ingredient.amount === 'string' &&
        (ingredient.baseQuantity === undefined ||
          typeof ingredient.baseQuantity === 'number'),
    ) &&
    Array.isArray(value.instructions) &&
    value.instructions.every((step) => typeof step === 'string') &&
    typeof value.imageUrl === 'string' &&
    Array.isArray(value.matchedIngredients) &&
    value.matchedIngredients.every((ingredient) => typeof ingredient === 'string')
  )
}

function containsCyrillic(value: string): boolean {
  return /\p{Script=Cyrillic}/u.test(value)
}

export function parseRecipeResponse(
  responseText: string,
  ingredients: string[],
  timeFilter: TimeFilter,
): Recipe {
  const parsed: unknown = JSON.parse(responseText)
  if (!isRecord(parsed)) {
    throw new Error('The recipe provider returned an invalid format.')
  }

  const {
    invalidIngredients,
    message,
    title,
    description,
    ingredients: items,
    instructions,
  } = parsed
  if (!Object.keys(parsed).every((key) => recipeResponseKeys.has(key))) {
    throw new Error('The recipe provider returned unexpected fields.')
  }

  if (invalidIngredients === true) {
    throw new Error(
      'The recipe provider returned an invalid-ingredients response where a recipe was expected.',
    )
  }

  if (
    invalidIngredients !== false ||
    message !== '' ||
    typeof title !== 'string' ||
    !title.trim() ||
    typeof description !== 'string' ||
    !description.trim() ||
    containsCyrillic(title) ||
    containsCyrillic(description) ||
    !Array.isArray(items) ||
    !Array.isArray(instructions) ||
    instructions.length < 3 ||
    instructions.length > 8 ||
    !instructions.every(isNonEmptyString) ||
    instructions.some(containsCyrillic) ||
    containsKnownInedibleIngredient(title) ||
    instructions.some((step) => containsKnownInedibleIngredient(step))
  ) {
    throw new Error('The recipe provider returned a recipe that does not match the requested format.')
  }

  const recipeIngredients: RecipeIngredient[] = items.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      containsCyrillic(item.name) ||
      typeof item.baseAmount !== 'number' ||
      !Number.isFinite(item.baseAmount) ||
      item.baseAmount <= 0 ||
      typeof item.unit !== 'string' ||
      !item.unit.trim() ||
      containsCyrillic(item.unit) ||
      containsKnownInedibleIngredient(item.name)
    ) {
      throw new Error('The recipe provider returned an ingredient without a name or quantity.')
    }

    return withBaseQuantity({
      name: item.name.trim(),
      amount: `${item.baseAmount} ${item.unit.trim()}`,
    })
  })

  if (recipeIngredients.length === 0) {
    throw new Error('The recipe provider returned a recipe without edible ingredients or cooking steps.')
  }

  const servings = 2
  const cleanTitle = title.trim()
  const prepTimeMinutes =
    timeFilter === 'fast' ? 12 : timeFilter === 'medium' ? 22 : 32
  return {
    id: `generated-${hashIngredients(ingredients)}-${timeFilter}`,
    title: cleanTitle,
    description: description.trim(),
    prepTimeMinutes,
    servings,
    baseServings: servings,
    difficulty: prepTimeMinutes < 15 ? 'Easy' : 'Medium',
    ingredients: recipeIngredients,
    instructions: instructions.map((step) => step.trim()),
    imageUrl: getGeneratedRecipeImageUrl(cleanTitle),
    matchedIngredients: ingredients,
  }
}

export function parseInvalidIngredientsResponse(
  parsed: Record<string, unknown>,
): InvalidIngredientsResponse | null {
  if (parsed.invalidIngredients !== true) return null
  if (
    parsed.message !== invalidIngredientsMessage ||
    !Object.keys(parsed).every((key) => recipeResponseKeys.has(key))
  ) {
    throw new Error('The recipe provider returned an invalid-ingredients response in an invalid format.')
  }

  return {
    invalidIngredients: true,
    message: parsed.message.trim(),
  }
}

export async function generateRecipe(
  ingredients: string[],
  timeFilter: TimeFilter,
  options: { signal?: AbortSignal } = {},
): Promise<RecipeGenerationResult> {
  const cleanedIngredients = cleanIngredients(ingredients)
  if (cleanedIngredients.length === 0) {
    return {
      status: 'empty',
      message: 'Add at least one ingredient to get your recipe started.',
    }
  }
  if (cleanedIngredients.some(containsKnownInedibleIngredient)) {
    return {
      status: 'invalidIngredients',
      invalidIngredients: true,
      message: invalidIngredientsMessage,
    }
  }

  const { signal } = options
  if (signal?.aborted) {
    throw new Error('Recipe generation was cancelled.')
  }

  let response: Response
  try {
    response = await fetch('/api/recipes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: cleanedIngredients, timeFilter }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    if (error instanceof TypeError) {
      const localResult = selectRecipe(cleanedIngredients, timeFilter)
      if (localResult.status === 'success') return localResult
    }
    throw error
  }

  if (!response.ok) {
    let message = 'Recipe generation is unavailable. Please try again.'
    try {
      const payload: unknown = await response.json()
      if (isRecord(payload) && isNonEmptyString(payload.error)) {
        message = payload.error
      }
    } catch {
      // The server may not return JSON for infrastructure errors.
    }
    throw new Error(message)
  }

  const payload: unknown = await response.json()
  return parseRecipeGenerationResult(payload)
}

function parseRecipeGenerationResult(
  value: unknown,
): RecipeGenerationResult {
  if (!isRecord(value) || typeof value.status !== 'string') {
    throw new Error('The recipe server returned an invalid response.')
  }
  if (
    value.status === 'invalidIngredients' &&
    value.invalidIngredients === true &&
    isNonEmptyString(value.message)
  ) {
    return {
      status: 'invalidIngredients',
      invalidIngredients: true,
      message: value.message,
    }
  }
  if (value.status === 'empty' && isNonEmptyString(value.message)) {
    return { status: 'empty', message: value.message }
  }
  if (
    value.status === 'success' &&
    (value.source === 'groq' || value.source === 'local') &&
    isRecipe(value.recipe)
  ) {
    return {
      status: 'success',
      source: value.source,
      recipe: value.recipe,
    }
  }
  throw new Error('The recipe server returned an invalid response.')
}
