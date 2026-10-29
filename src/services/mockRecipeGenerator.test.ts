import { afterEach, describe, expect, it, vi } from 'vitest'
import { recipeTemplates } from '../data/recipeTemplates'
import {
  isWithinTimeFilter,
  normalizeIngredient,
  selectRecipe,
} from './mockRecipeGenerator'
import {
  readFavoriteRecipes,
  writeFavoriteRecipes,
} from './favoriteStorage'

describe('mock recipe generator', () => {
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

  it('returns a friendly result for empty or unmatched ingredients', () => {
    expect(selectRecipe([], 'all').status).toBe('empty')
    expect(selectRecipe(['dragonfruit'], 'all').status).toBe('no-match')
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
