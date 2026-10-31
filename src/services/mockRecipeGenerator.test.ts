import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRecipeImageUrl, recipeTemplates } from '../data/recipeTemplates'
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

  it('chooses a matching Unsplash image for recipe title keywords', () => {
    const omelette = recipeTemplates.find(
      (recipe) => recipe.id === 'garden-omelette',
    )

    expect(omelette?.imageUrl).toContain(
      'images.unsplash.com/photo-1525351484163-7529414344d8',
    )
  })

  it('uses the lead ingredient for generated recipe photos', () => {
    expect(
      getRecipeImageUrl('Gourmet Dragonfruit & Kale Skillet', [
        'dragonfruit',
        'kale',
      ]),
    ).toContain('photo-1568702846914-96b305d2aaeb')
    expect(
      getRecipeImageUrl('Gourmet Mystery & Salmon Skillet', [
        'mystery ingredient',
        'salmon',
      ]),
    ).toContain('photo-1519708227418-c8fd9a32b7a2')
  })

  it('selects a specific image when a single common ingredient is entered', () => {
    expect(getRecipeImageUrl('Rustic Garlic Medley', ['garlic'])).toContain(
      'photo-1473093295043-cdd812d0e601',
    )
    expect(getRecipeImageUrl('Rustic Bread Medley', ['bread'])).toContain(
      'photo-1509440159596-0249088772ff',
    )
  })

  it('uses a neutral cooked-dish fallback for ingredients without a mapping', () => {
    const imageUrl = getRecipeImageUrl('Rustic Mystery Ingredient Medley', [
      'mystery ingredient',
    ])

    expect(imageUrl).toContain('photo-1551183053-bf91a1d81141')
    expect(imageUrl).not.toContain('photo-1512621776951-a57141f2eefd')
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
      expect(result.recipe.instructions).toHaveLength(4)
      expect(result.recipe.instructions.join(' ')).toContain('dragonfruit')
      expect(result.recipe.instructions.join(' ')).toContain('kale')
      expect(result.recipe.imageUrl).toContain('images.unsplash.com')
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
