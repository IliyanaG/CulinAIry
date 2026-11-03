import { APIError } from 'groq-sdk'

export type RecipeErrorStage =
  | 'provider_request'
  | 'json_parse'
  | 'recipe_validation'
  | 'route_handler'

const stageMessages: Record<RecipeErrorStage, string> = {
  provider_request: 'Groq request failed before response processing.',
  json_parse: 'Groq response was not valid JSON.',
  recipe_validation: 'Groq response failed recipe validation.',
  route_handler: 'Recipe API route failed.',
}

function safeIdentifier(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length > 64 ||
    !/^[A-Za-z0-9_.-]+$/.test(value)
  ) {
    return undefined
  }
  return value
}

function safeScalar(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return safeIdentifier(value)
}

export function createSafeErrorDetails(
  error: unknown,
  stage: RecipeErrorStage,
): Record<string, string | number> {
  const details: Record<string, string | number> = {
    stage,
    name:
      error instanceof Error
        ? safeIdentifier(error.name) ?? 'Error'
        : 'UnknownError',
    message: stageMessages[stage],
  }

  if (error instanceof APIError) {
    if (typeof error.status === 'number' && Number.isFinite(error.status)) {
      details.status = error.status
    }
    const body = error.error
    if (typeof body === 'object' && body !== null) {
      const fields = body as Record<string, unknown>
      const nestedError = fields.error
      const nestedFields =
        typeof nestedError === 'object' && nestedError !== null
          ? (nestedError as Record<string, unknown>)
          : undefined
      const code =
        safeScalar(fields.code) ?? safeScalar(nestedFields?.code)
      const type =
        safeScalar(fields.type) ?? safeScalar(nestedFields?.type)
      if (code !== undefined) details.code = code
      if (type !== undefined) details.type = type
    }
  }

  return details
}

export function logRecipeError(error: unknown, stage: RecipeErrorStage): void {
  console.error('[recipe-api] Error', createSafeErrorDetails(error, stage))
}
