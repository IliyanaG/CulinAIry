import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  generatedRecipeImageUrl,
  recipeTemplates,
} from '../data/recipeTemplates'
import {
  isWithinTimeFilter,
  normalizeIngredient,
  selectRecipe,
} from './mockRecipeGenerator'
import {
  readFavoriteRecipes,
  writeFavoriteRecipes,
} from './favoriteStorage'
import { scaleIngredientAmount, withBaseQuantity } from '../utils/ingredientScaling'

describe('mock recipe generator', () => {
  it('uses a stable rustic kitchen image for generated recipes', () => {
    expect(generatedRecipeImageUrl).toContain(
      'photo-1556911220-bff31c812dba',
    )
    expect(generatedRecipeImageUrl).toMatch(/^https:\/\/images\.unsplash\.com\//)
  })

  it('uses a matching static image for each predefined recipe', () => {
    const expectedImages: Record<string, string> = {
      'tomato-garlic-pasta': 'photo-1551183053-bf91a1d81141',
      'garlic-chicken-skillet': 'photo-1532550907401-a500c9a57435',
      'crunchy-chickpea-salad': 'photo-1512621776951-a57141f2eefd',
      'tomato-chickpea-curry': 'photo-1603894584373-5ac82b2ae398',
      'garden-omelette': 'photo-1525351484163-7529414344d8',
      'garlicky-lentil-soup': 'photo-1547592180-85f173990554',
    }

    for (const recipe of recipeTemplates) {
      expect(recipe.imageUrl).toContain(expectedImages[recipe.id])
      expect(recipe.imageUrl).toMatch(/^https:\/\/images\.unsplash\.com\//)
    }
  })

  it('selects the closest matching recipe', () => {
    const result = selectRecipe(['tomato', 'chicken', 'garlic'], 'all')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.recipe.id).toBe('garlic-chicken-skillet')
      expect(result.recipe.matchedIngredients).toEqual([
        'chicken',
        'tomato',
        'garlic',
      ])
    }
  })

  it('ranks the recipe with the most matching ingredients first', () => {
    const result = selectRecipe(
      ['chickpeas', 'tomatoes', 'lemon', 'feta', 'parsley'],
      'all',
    )

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.recipe.id).toBe('crunchy-chickpea-salad')
      expect(result.recipe.matchedIngredients).toHaveLength(5)
    }
  })

  it('normalizes common plurals and whitespace', () => {
    expect(normalizeIngredient('  Chickpeas  ')).toBe('chickpea')
    expect(normalizeIngredient('Chicken   Breast')).toBe('chicken')
  })

  it('keeps fast and medium recipes within their strict time limits', () => {
    expect(isWithinTimeFilter(14, 'fast')).toBe(true)
    expect(isWithinTimeFilter(15, 'fast')).toBe(false)
    expect(isWithinTimeFilter(29, 'medium')).toBe(true)
    expect(isWithinTimeFilter(30, 'medium')).toBe(false)
    expect(isWithinTimeFilter(30, 'all')).toBe(true)
  })

  it('returns an empty result when no ingredients are provided', () => {
    expect(selectRecipe([], 'all').status).toBe('empty')
  })

  it('builds a complete recipe from ingredients outside the mock collection', () => {
    const result = selectRecipe(['dragonfruit', 'kale'], 'all')

    expect(result).toMatchObject({
      status: 'success',
    })
    if (result.status === 'success') {
      expect(result.recipe.id).toMatch(/^generated-/)
      expect(result.recipe.title).toContain('Dragonfruit')
      expect(result.recipe.ingredients.slice(0, 2).map(({ name }) => name)).toEqual([
        'dragonfruit',
        'kale',
      ])
      expect(result.recipe.ingredients.length).toBeGreaterThanOrEqual(5)
      expect(result.recipe.ingredients[0].baseQuantity).toBe(1)
      expect(
        scaleIngredientAmount(
          result.recipe.ingredients[0],
          4,
          result.recipe.baseServings,
        ),
      ).toBe('2 cups')
      expect(result.recipe.instructions).toHaveLength(4)
      expect(result.recipe.instructions.join(' ')).toContain('dragonfruit')
      expect(result.recipe.instructions.join(' ')).toContain('kale')
      expect(result.recipe.imageUrl).toBe(generatedRecipeImageUrl)
    }
  })

  it('chooses a recipe format that fits pantry staples', () => {
    const pasta = selectRecipe(['pasta', 'mystery greens'], 'all')
    const rice = selectRecipe(['rice', 'mystery greens'], 'all')
    const bread = selectRecipe(['bread', 'mystery greens'], 'all')

    expect(pasta.status).toBe('success')
    expect(rice.status).toBe('success')
    expect(bread.status).toBe('success')
    if (
      pasta.status === 'success' &&
      rice.status === 'success' &&
      bread.status === 'success'
    ) {
      expect(pasta.recipe.title).toContain('Pasta')
      expect(rice.recipe.title).toContain('Rice Bowl')
      expect(bread.recipe.title).toContain('Toast')
    }
  })

  it('varies generated formats for ingredients without a matching staple', () => {
    const combinations = [
      ['dragonfruit', 'kale'],
      ['plantain', 'parsnip'],
      ['okra', 'plum'],
      ['artichoke', 'turnip'],
      ['fig', 'celeriac'],
    ]
    const titles = combinations.map((items) => {
      const result = selectRecipe(items, 'all')
      return result.status === 'success' ? result.recipe.title : ''
    })

    expect(new Set(titles).size).toBeGreaterThan(1)
    expect(titles.some((title) => title.includes('Skillet'))).toBe(false)
  })

  it('does not suggest an uncooked salad for raw animal ingredients', () => {
    const result = selectRecipe(['chicken', 'dragonfruit'], 'all')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.recipe.title).not.toContain('Salad')
      expect(result.recipe.instructions.join(' ')).toContain(
        'safely cooked',
      )
    }
  })

  it('scales numeric ingredient quantities from the recipe base servings', () => {
    const ingredient = withBaseQuantity({ amount: '1½ cups', name: 'tomato' })

    expect(ingredient.baseQuantity).toBe(1.5)
    expect(scaleIngredientAmount(ingredient, 4, 2)).toBe('3 cups')
    expect(scaleIngredientAmount({ amount: '¾ cup', name: 'rice' }, 1, 2)).toBe(
      '⅜ cup',
    )
  })

  it('leaves qualitative ingredient amounts unchanged when scaling', () => {
    expect(
      scaleIngredientAmount(
        { amount: 'To taste', name: 'salt' },
        5,
        2,
      ),
    ).toBe('To taste')
  })

  it('uses two servings as the base for dynamically generated recipes', () => {
    const result = selectRecipe(['dragonfruit', 'kale'], 'all')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.recipe.servings).toBe(2)
      expect(result.recipe.baseServings).toBe(2)
      expect(result.recipe.ingredients.some((item) => item.baseQuantity)).toBe(
        true,
      )
    }
  })

  it('keeps every entered ingredient when a known and unknown item are mixed', () => {
    const result = selectRecipe(['tomato', 'dragonfruit'], 'all')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.recipe.id).toMatch(/^generated-/)
      expect(result.recipe.ingredients.map(({ name }) => name)).toContain(
        'dragonfruit',
      )
      expect(result.recipe.ingredients.map(({ name }) => name)).toContain(
        'tomato',
      )
    }
  })

  it('respects time filters when composing a dynamic recipe', () => {
    const fast = selectRecipe(['dragonfruit'], 'fast')
    const medium = selectRecipe(['dragonfruit'], 'medium')

    expect(fast.status).toBe('success')
    expect(medium.status).toBe('success')
    if (fast.status === 'success') {
      expect(fast.recipe.prepTimeMinutes).toBeLessThan(15)
    }
    if (medium.status === 'success') {
      expect(medium.recipe.prepTimeMinutes).toBeLessThan(30)
    }
  })

  it('never returns a recipe above the selected time limit', () => {
    const result = selectRecipe(['chickpeas', 'tomatoes'], 'fast')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.recipe.prepTimeMinutes).toBeLessThan(15)
    }
  })
})

describe('favorite storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads structured recipes from LocalStorage', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => JSON.stringify([recipeTemplates[0]]),
      },
    })

    expect(readFavoriteRecipes()).toEqual({
      recipes: [recipeTemplates[0]],
      error: null,
    })
  })

  it('adds the static rustic fallback image to older saved recipes', () => {
    const { imageUrl: _imageUrl, ...legacyRecipe } = recipeTemplates[0]
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => JSON.stringify([legacyRecipe]),
      },
    })

    expect(readFavoriteRecipes()).toEqual({
      recipes: [{ ...legacyRecipe, imageUrl: generatedRecipeImageUrl }],
      error: null,
    })
  })

  it('reports malformed saved data instead of accepting it', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: () => '{not json' },
    })

    expect(readFavoriteRecipes()).toMatchObject({
      recipes: [],
      error: expect.stringContaining('could not be read'),
    })
  })

  it('writes favorites to the expected LocalStorage key', () => {
    const setItem = vi.fn()
    vi.stubGlobal('window', {
      localStorage: { getItem: () => null, setItem },
    })

    expect(writeFavoriteRecipes([recipeTemplates[0]])).toBeNull()
    expect(setItem).toHaveBeenCalledWith(
      'culinairy:favorites',
      JSON.stringify([recipeTemplates[0]]),
    )
  })
})
