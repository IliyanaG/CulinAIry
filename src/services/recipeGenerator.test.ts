import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  generatedRecipeCategoryImageUrls,
  generatedRecipeImageUrl,
  getGeneratedRecipeImageUrl,
  recipeTemplates,
} from '../data/recipeTemplates'
import {
  cleanIngredients,
  isWithinTimeFilter,
  normalizeIngredient,
  parseRecipeResponse,
  generateRecipe,
  selectRecipe,
} from './recipeGenerator'
import {
  readFavoriteRecipes,
  writeFavoriteRecipes,
} from './favoriteStorage'
import { scaleIngredientAmount, withBaseQuantity } from '../utils/ingredientScaling'

describe('recipe generator', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('parses a typed recipe from valid structured JSON', () => {
    const recipe = parseRecipeResponse(
      JSON.stringify({
        invalidIngredients: false,
        message: '',
        title: 'Warm Salmon Bowl',
        description: 'Salmon with greens and grains.',
        ingredients: [
          { name: 'salmon', baseAmount: 300, unit: 'g' },
          { name: 'spinach', baseAmount: 2, unit: 'cups' },
        ],
        instructions: [
          'Season the salmon with salt and black pepper.',
          'Cook the salmon in a hot skillet until done.',
          'Add the spinach and cook until wilted.',
        ],
      }),
      ['salmon', 'spinach'],
      'medium',
    )

    expect(recipe).toMatchObject({
      title: 'Warm Salmon Bowl',
      prepTimeMinutes: 22,
      servings: 2,
      baseServings: 2,
      matchedIngredients: ['salmon', 'spinach'],
    })
    expect(recipe.ingredients[0].baseQuantity).toBe(300)
  })

  it('rejects invalid quantities, unexpected fields, and non-English content', () => {
    const valid = {
      invalidIngredients: false,
      message: '',
      title: 'Quick Bowl',
      description: 'A quick meal.',
      ingredients: [{ name: 'spinach', baseAmount: 1, unit: 'cup' }],
      instructions: ['Wash the spinach.', 'Cook the spinach.', 'Serve the dish.'],
    }

    expect(() =>
      parseRecipeResponse(
        JSON.stringify({
          ...valid,
          ingredients: [{ name: 'spinach', baseAmount: 0, unit: 'cup' }],
        }),
        ['spinach'],
        'fast',
      ),
    ).toThrow(/ingredient without a name or quantity/)
    expect(() =>
      parseRecipeResponse(JSON.stringify({ ...valid, extra: true }), ['spinach'], 'fast'),
    ).toThrow(/unexpected fields/)
    expect(() =>
      parseRecipeResponse(
        JSON.stringify({ ...valid, description: 'Вкусна рецепта със спанак.' }),
        ['spinach'],
        'fast',
      ),
    ).toThrow(/requested format/)
  })

  it('keeps strict ingredient validation before making an API request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(generateRecipe(['garlic', 'ножица'], 'all')).resolves.toMatchObject({
      status: 'invalidIngredients',
      invalidIngredients: true,
      message: 'Please enter real and edible food products.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the local recipe when the API server cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(generateRecipe(['chicken', 'rice'], 'all')).resolves.toMatchObject({
      status: 'success',
      source: 'local',
    })
  })

  it('sends ingredient and time-filter data to the server and returns its result', async () => {
    const result = selectRecipe(['chicken', 'rice'], 'all')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      generateRecipe(['chicken', 'rice'], 'medium'),
    ).resolves.toMatchObject({
      status: 'success',
      source: 'local',
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/recipes/generate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          ingredients: ['chicken', 'rice'],
          timeFilter: 'medium',
        }),
      }),
    )
  })

  it('propagates cancellation instead of producing a fallback recipe', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn())

    await expect(
      generateRecipe(['chicken', 'rice'], 'all', {
        signal: controller.signal,
      }),
    ).rejects.toThrow('cancel')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('passes active cancellation through to the API request', async () => {
    const controller = new AbortController()
    let requestStarted: () => void = () => {}
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            requestStarted()
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            )
          }),
      ),
    )

    const generation = generateRecipe(['chicken', 'rice'], 'all', {
      signal: controller.signal,
    })
    await started
    controller.abort()

    await expect(generation).rejects.toThrow()
    expect(fetch).toHaveBeenCalledWith(
      '/api/recipes/generate',
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('selects and ranks matching local recipes', () => {
    const closest = selectRecipe(['tomato', 'chicken', 'garlic'], 'all')
    const mostMatches = selectRecipe(
      ['chickpeas', 'tomatoes', 'lemon', 'feta', 'parsley'],
      'all',
    )
    expect(closest).toMatchObject({
      status: 'success',
      recipe: {
        id: 'garlic-chicken-skillet',
        matchedIngredients: ['chicken', 'tomato', 'garlic'],
      },
    })
    expect(mostMatches).toMatchObject({
      status: 'success',
      recipe: { id: 'crunchy-chickpea-salad', matchedIngredients: expect.arrayContaining(['feta']) },
    })
  })

  it('normalizes ingredients and applies time-filter limits', () => {
    expect(cleanIngredients([' tomato ', 'tomato', 'rice'])).toEqual([
      'tomato',
      'rice',
    ])
    expect(normalizeIngredient('  Chickpeas  ')).toBe('chickpea')
    expect(normalizeIngredient('Chicken   Breast')).toBe('chicken')
    expect(isWithinTimeFilter(14, 'fast')).toBe(true)
    expect(isWithinTimeFilter(15, 'fast')).toBe(false)
    expect(isWithinTimeFilter(29, 'medium')).toBe(true)
    expect(isWithinTimeFilter(30, 'medium')).toBe(false)
    expect(selectRecipe([], 'all').status).toBe('empty')
  })

  it('builds a complete local recipe with all supplied ingredients', () => {
    const result = selectRecipe(['dragonfruit', 'kale'], 'all')
    expect(result).toMatchObject({ status: 'success' })
    if (result.status === 'success') {
      expect(result.recipe.id).toMatch(/^generated-/)
      expect(result.recipe.ingredients.slice(0, 2).map(({ name }) => name)).toEqual([
        'dragonfruit',
        'kale',
      ])
      expect(result.recipe.instructions).toHaveLength(4)
      expect(result.recipe.servings).toBe(2)
    }
  })

  it('preserves local recipe imagery and generated-image categories', () => {
    expect(generatedRecipeImageUrl).toContain('photo-1556911220-bff31c812dba')
    expect(getGeneratedRecipeImageUrl('Chocolate muffin')).toBe(
      generatedRecipeCategoryImageUrls.baking,
    )
    expect(getGeneratedRecipeImageUrl('Fresh green veggie salad')).toBe(
      generatedRecipeCategoryImageUrls.salads,
    )
    expect(recipeTemplates).toHaveLength(6)
    expect(recipeTemplates.every((recipe) => recipe.imageUrl.startsWith('https://'))).toBe(
      true,
    )
  })

  it('keeps the assigned image for every predefined recipe', () => {
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

  it('chooses local recipe formats based on pantry staples and time available', () => {
    const pasta = selectRecipe(['pasta', 'mystery greens'], 'all')
    const rice = selectRecipe(['rice', 'mystery greens'], 'all')
    const bread = selectRecipe(['bread', 'mystery greens'], 'all')
    const fast = selectRecipe(
      ['spinach', 'chickpeas', 'salmon', 'bread'],
      'fast',
    )
    const medium = selectRecipe(
      ['spinach', 'chickpeas', 'salmon', 'bread'],
      'medium',
    )

    expect(pasta).toMatchObject({ status: 'success', recipe: { title: expect.stringContaining('Pasta') } })
    expect(rice).toMatchObject({ status: 'success', recipe: { title: expect.stringContaining('Rice Bowl') } })
    expect(bread).toMatchObject({ status: 'success', recipe: { title: expect.stringContaining('Toast') } })
    expect(fast).toMatchObject({ status: 'success', recipe: { title: expect.stringContaining('Golden Pantry Toast') } })
    expect(medium).toMatchObject({
      status: 'success',
      recipe: {
        title: expect.stringContaining('Warm Salmon & Chickpea Skillet'),
        prepTimeMinutes: expect.any(Number),
      },
    })
    if (medium.status === 'success') {
      expect(medium.recipe.prepTimeMinutes).toBeLessThan(30)
      expect(medium.recipe.instructions).toHaveLength(5)
      expect(medium.recipe.instructions.join(' ')).toContain('sear')
      expect(medium.recipe.instructions.join(' ')).toContain('simmer')
    }
  })

  it('varies generated formats and gives raw animal ingredients safe cooking steps', () => {
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
    const chicken = selectRecipe(['chicken', 'dragonfruit'], 'all')

    expect(new Set(titles).size).toBeGreaterThan(1)
    expect(titles.some((title) => title.includes('Skillet'))).toBe(false)
    expect(chicken).toMatchObject({ status: 'success' })
    if (chicken.status === 'success') {
      expect(chicken.recipe.title).not.toContain('Salad')
      expect(chicken.recipe.instructions.join(' ')).toContain('safely cooked')
    }
  })

  it('scales numeric quantities but leaves qualitative amounts unchanged', () => {
    const ingredient = withBaseQuantity({ amount: '1½ cups', name: 'tomato' })
    expect(ingredient.baseQuantity).toBe(1.5)
    expect(scaleIngredientAmount(ingredient, 4, 2)).toBe('3 cups')
    expect(
      scaleIngredientAmount({ amount: '¾ cup', name: 'rice' }, 1, 2),
    ).toBe('⅜ cup')
    expect(
      scaleIngredientAmount({ amount: 'To taste', name: 'salt' }, 5, 2),
    ).toBe('To taste')
  })

  it('uses two servings and respects limits in generated local recipes', () => {
    const ingredients = ['dragonfruit', 'kale']
    const base = selectRecipe(ingredients, 'all')
    const fast = selectRecipe(ingredients, 'fast')
    const medium = selectRecipe(ingredients, 'medium')
    const mixed = selectRecipe(['tomato', 'dragonfruit'], 'all')

    expect(base).toMatchObject({
      status: 'success',
      recipe: { servings: 2, baseServings: 2 },
    })
    expect(fast).toMatchObject({ status: 'success' })
    expect(medium).toMatchObject({ status: 'success' })
    expect(mixed).toMatchObject({ status: 'success' })
    if (
      fast.status === 'success' &&
      medium.status === 'success' &&
      mixed.status === 'success'
    ) {
      expect(fast.recipe.prepTimeMinutes).toBeLessThan(15)
      expect(medium.recipe.prepTimeMinutes).toBeLessThan(30)
      expect(mixed.recipe.ingredients.map(({ name }) => name)).toEqual(
        expect.arrayContaining(['tomato', 'dragonfruit']),
      )
    }
  })
})

describe('favorite storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads structured recipes from LocalStorage', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: () => JSON.stringify([recipeTemplates[0]]) },
    })
    expect(readFavoriteRecipes()).toEqual({
      recipes: [recipeTemplates[0]],
      error: null,
    })
  })

  it('supplies a fallback image to older saved recipes', () => {
    const { imageUrl: _imageUrl, ...legacyRecipe } = recipeTemplates[0]
    vi.stubGlobal('window', {
      localStorage: { getItem: () => JSON.stringify([legacyRecipe]) },
    })
    expect(readFavoriteRecipes()).toEqual({
      recipes: [{ ...legacyRecipe, imageUrl: generatedRecipeImageUrl }],
      error: null,
    })
  })

  it('rejects malformed saved data and writes favorites to the expected key', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: () => '{not json' },
    })
    expect(readFavoriteRecipes()).toMatchObject({
      recipes: [],
      error: expect.stringContaining('could not be read'),
    })

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
