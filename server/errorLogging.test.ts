import { afterEach, describe, expect, it, vi } from 'vitest'
import { APIError } from 'groq-sdk'
import {
  createSafeErrorDetails,
  logRecipeError,
  type RecipeErrorStage,
} from './errorLogging.ts'

describe('recipe error logging', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['provider_request', 'Groq request failed before response processing.'],
    ['json_parse', 'Groq response was not valid JSON.'],
    ['recipe_validation', 'Groq response failed recipe validation.'],
    ['route_handler', 'Recipe API route failed.'],
  ] as const)(
    'classifies %s failures with a safe message',
    (stage, message) => {
      expect(createSafeErrorDetails(new Error('unsafe payload'), stage)).toEqual(
        {
          stage,
          name: 'Error',
          message,
        },
      )
    },
  )

  it('logs only safe SDK error details and allow-listed scalar fields', () => {
    const error = new APIError(
      429,
      {
        code: 'rate_limit_exceeded',
        type: 'rate_limit_error',
        message: 'private ingredients and full provider payload',
        request: { headers: { authorization: 'Bearer test-secret' } },
      },
      'Bearer test-secret private ingredients',
      new Headers({ authorization: 'Bearer test-secret' }),
    )
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    logRecipeError(error, 'provider_request')

    expect(log).toHaveBeenCalledOnce()
    const [label, details] = log.mock.calls[0] as [
      string,
      Record<string, string | number>,
    ]
    expect(label).toBe('[recipe-api] Error')
    expect(details).toMatchObject({
      stage: 'provider_request',
      status: 429,
      code: 'rate_limit_exceeded',
      type: 'rate_limit_error',
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain('test-secret')
    expect(JSON.stringify(log.mock.calls)).not.toContain('private ingredients')
    expect(JSON.stringify(log.mock.calls)).not.toContain('authorization')
    expect(JSON.stringify(log.mock.calls)).not.toContain('full provider payload')
  })

  it('extracts safe code and type from a nested provider error object', () => {
    const error = new APIError(
      400,
      {
        error: {
          code: 'invalid_request',
          type: 'invalid_request_error',
          message: 'private ingredients and provider details',
          headers: { authorization: '******' },
        },
        message: '****** private prompt',
      },
      '****** private prompt',
      new Headers({ authorization: '******' }),
    )
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    logRecipeError(error, 'provider_request')

    expect(log).toHaveBeenCalledWith(
      '[recipe-api] Error',
      expect.objectContaining({
        stage: 'provider_request',
        status: 400,
        code: 'invalid_request',
        type: 'invalid_request_error',
      }),
    )
    expect(JSON.stringify(log.mock.calls)).not.toContain('private')
    expect(JSON.stringify(log.mock.calls)).not.toContain('authorization')
    expect(JSON.stringify(log.mock.calls)).not.toContain('provider details')
  })

  it('omits non-allow-listed values for code and type', () => {
    const error = new APIError(
      400,
      { code: 'contains private data', type: { detail: 'secret' } },
      'private provider message',
      new Headers(),
    )

    const details = createSafeErrorDetails(
      error,
      'route_handler' satisfies RecipeErrorStage,
    )

    expect(details).not.toHaveProperty('code')
    expect(details).not.toHaveProperty('type')
    expect(JSON.stringify(details)).not.toContain('private')
    expect(JSON.stringify(details)).not.toContain('secret')
  })
})
