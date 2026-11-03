import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateGroqRecipe } from './recipeGenerator.ts'

const validRecipeResponse = {
  invalidIngredients: false,
  message: '',
  title: 'Chicken and Rice',
  description: 'A comforting chicken and rice meal.',
  ingredients: [
    { name: 'chicken', baseAmount: 200, unit: 'g' },
    { name: 'rice', baseAmount: 100, unit: 'g' },
  ],
  instructions: [
    'Rinse the rice.',
    'Cook the chicken until fully done.',
    'Boil the rice and serve with the chicken.',
  ],
}

function providerResponse(
  content: unknown,
  statusCode = 200,
  headers: Record<string, string> = {},
): Response {
  const body =
    statusCode === 200
      ? {
          id: 'test-completion',
          object: 'chat.completion',
          created: 1,
          model: 'openai/gpt-oss-20b',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              logprobs: null,
              message: { role: 'assistant', content },
            },
          ],
        }
      : { error: { message: 'Provider request failed.' } }
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

function providerFetch(
  callback: (signal: AbortSignal | null, body: string) => Promise<Response>,
): typeof fetch {
  return async (_input, init) =>
    callback(
      init?.signal ?? null,
      typeof init?.body === 'string' ? init.body : '',
    )
}

describe('Groq recipe generation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests strict structured JSON from the selected Groq model', async () => {
    const fetchMock = vi.fn(
      providerFetch(async (_signal, requestBody) => {
        const request = JSON.parse(requestBody)
        expect(request.model).toBe('openai/gpt-oss-20b')
        expect(request.stream).toBe(false)
        expect(request.response_format).toMatchObject({
          type: 'json_schema',
          json_schema: {
            name: 'recipe_generation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: expect.arrayContaining(['title', 'ingredients']),
            },
          },
        })
        const schema = request.response_format.json_schema.schema
        const ingredientSchema = schema.properties.ingredients.items
        expect(schema.required).toEqual(Object.keys(schema.properties))
        expect(schema.additionalProperties).toBe(false)
        expect(ingredientSchema.required).toEqual(
          Object.keys(ingredientSchema.properties),
        )
        expect(ingredientSchema.additionalProperties).toBe(false)
        return providerResponse(JSON.stringify(validRecipeResponse))
      }),
    )

    const result = await generateGroqRecipe(
      ['chicken', 'rice'],
      'all',
      { apiKey: 'test-key', fetch: fetchMock },
    )

    expect(result).toMatchObject({
      status: 'success',
      source: 'groq',
      recipe: {
        title: 'Chicken and Rice',
        ingredients: expect.arrayContaining([
          expect.objectContaining({ name: 'chicken', baseQuantity: 200 }),
        ]),
      },
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('returns a validated invalid-ingredient response', async () => {
    const invalidResponse = {
      invalidIngredients: true,
      message: 'Please enter real and edible food products.',
      title: '',
      description: '',
      ingredients: [],
      instructions: [],
    }

    const result = await generateGroqRecipe(
      ['mystery substance'],
      'all',
      {
        apiKey: 'test-key',
        fetch: providerFetch(async () =>
          providerResponse(JSON.stringify(invalidResponse)),
        ),
      },
    )

    expect(result).toEqual({
      status: 'invalidIngredients',
      invalidIngredients: true,
      message: invalidResponse.message,
    })
  })

  it('rejects known inedible ingredients before calling Groq', async () => {
    const fetchMock = vi.fn<typeof fetch>()

    await expect(
      generateGroqRecipe(['chicken', 'ножица'], 'all', {
        apiKey: 'test-key',
        fetch: fetchMock,
      }),
    ).resolves.toMatchObject({
      status: 'invalidIngredients',
      invalidIngredients: true,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects malformed or schema-invalid model responses', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      generateGroqRecipe(['chicken', 'rice'], 'all', {
        apiKey: 'test-key',
        fetch: providerFetch(async () => providerResponse('not JSON')),
      }),
    ).rejects.toThrow()

    expect(log).toHaveBeenCalledWith(
      '[recipe-api] Error',
      expect.objectContaining({ stage: 'json_parse' }),
    )
  })

  it('logs recipe validation failures under their own stage', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const invalidRecipe = {
      ...validRecipeResponse,
      title: '',
    }

    await expect(
      generateGroqRecipe(['chicken', 'rice'], 'all', {
        apiKey: 'test-key',
        fetch: providerFetch(async () =>
          providerResponse(JSON.stringify(invalidRecipe)),
        ),
      }),
    ).rejects.toThrow()

    expect(log).toHaveBeenCalledWith(
      '[recipe-api] Error',
      expect.objectContaining({ stage: 'recipe_validation' }),
    )
  })

  it('retries a rate limit once and succeeds', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        providerResponse(null, 429, { 'retry-after': '0' }),
      )
      .mockResolvedValueOnce(
        providerResponse(JSON.stringify(validRecipeResponse)),
      )

    const result = await generateGroqRecipe(
      ['chicken', 'rice'],
      'all',
      { apiKey: 'test-key', fetch: fetchMock },
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ status: 'success', source: 'groq' })
  })

  it('uses the local recipe after exhausting a rate limit retry', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      providerResponse(null, 429, { 'retry-after': '0' }),
    )

    const result = await generateGroqRecipe(
      ['chicken', 'rice'],
      'all',
      { apiKey: 'test-key', fetch: fetchMock },
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ status: 'success', source: 'local' })
  })

  it('uses the local recipe after a request timeout without retrying', async () => {
    const fetchMock = vi.fn(
      providerFetch(
        (_signal, _body) =>
          new Promise<Response>((_resolve, reject) => {
            _signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true },
            )
          }),
      ),
    )

    const result = await generateGroqRecipe(
      ['chicken', 'rice'],
      'all',
      { apiKey: 'test-key', fetch: fetchMock, timeoutMs: 5 },
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ status: 'success', source: 'local' })
  })

  it('retries a transient network failure once before local fallback', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('Network unavailable'))

    const result = await generateGroqRecipe(
      ['chicken', 'rice'],
      'all',
      { apiKey: 'test-key', fetch: fetchMock },
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ status: 'success', source: 'local' })
  })

  it('does not retry or fall back for authentication errors', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      providerResponse(null, 401),
    )

    await expect(
      generateGroqRecipe(['chicken', 'rice'], 'all', {
        apiKey: 'test-key',
        fetch: fetchMock,
      }),
    ).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('propagates caller cancellation instead of returning a fallback', async () => {
    const controller = new AbortController()
    let requestStarted: () => void = () => {}
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve
    })
    const fetchMock = providerFetch(
      (signal) =>
        new Promise<Response>((_resolve, reject) => {
          requestStarted()
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          )
        }),
    )

    const generation = generateGroqRecipe(
      ['chicken', 'rice'],
      'all',
      { apiKey: 'test-key', fetch: fetchMock, signal: controller.signal },
    )
    await started
    controller.abort()

    await expect(generation).rejects.toThrow()
  })
})
