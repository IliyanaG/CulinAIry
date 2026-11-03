import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRecipeApiServer } from './index.ts'

function providerFetch(content: string): typeof fetch {
  return async () =>
    new Response(
      JSON.stringify({
        id: 'api-test',
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
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
}

describe('recipe API server', () => {
  let server: ReturnType<typeof createRecipeApiServer> | undefined

  afterEach(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()))
      })
    }
    server = undefined
  })

  it('validates input and returns the recipe generation result', async () => {
    const modelResponse = JSON.stringify({
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
    })
    server = createRecipeApiServer({
      apiKey: 'test-key',
      fetch: providerFetch(modelResponse),
    })
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind to a TCP port.')
    }
    const baseUrl = `http://127.0.0.1:${address.port}`

    const invalidRequest = await fetch(`${baseUrl}/api/recipes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: 'chicken', timeFilter: 'all' }),
    })
    expect(invalidRequest.status).toBe(400)

    const response = await fetch(`${baseUrl}/api/recipes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: ['chicken', 'rice'],
        timeFilter: 'all',
      }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      status: 'success',
      source: 'groq',
      recipe: { title: 'Chicken and Rice' },
    })
  })

  it('does not expose missing server configuration as a successful response', async () => {
    server = createRecipeApiServer({ apiKey: '' })
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind to a TCP port.')
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/recipes/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ['chicken'],
          timeFilter: 'all',
        }),
      },
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('not configured'),
    })
  })

  it('logs route failures with a safe route-handler stage', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    server = createRecipeApiServer({
      apiKey: 'test-secret',
      fetch: async () =>
        new Response(
          JSON.stringify({
            error: {
              message: 'private provider payload',
              code: 'invalid_api_key',
              type: 'authentication_error',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
    })
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind to a TCP port.')
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/recipes/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ['chicken'],
          timeFilter: 'all',
        }),
      },
    )

    expect(response.status).toBe(502)
    expect(log).toHaveBeenCalledWith(
      '[recipe-api] Error',
      expect.objectContaining({ stage: 'route_handler', status: 401 }),
    )
    expect(JSON.stringify(log.mock.calls)).not.toContain('test-secret')
    expect(JSON.stringify(log.mock.calls)).not.toContain('private provider payload')
    expect(JSON.stringify(log.mock.calls)).not.toContain('authorization')
  })
})
