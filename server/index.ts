import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateGroqRecipe } from './recipeGenerator.ts'
import { logRecipeError } from './errorLogging.ts'
import type { TimeFilter } from '../src/types/recipe.ts'

const port = 5000
const maxBodyBytes = 16_384

interface RecipeRequest {
  ingredients: string[]
  timeFilter: TimeFilter
}

interface ServerOptions {
  apiKey?: string
  fetch?: typeof fetch
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRecipeRequest(value: unknown): value is RecipeRequest {
  if (!isRecord(value)) return false
  return (
    Array.isArray(value.ingredients) &&
    value.ingredients.every((item) => typeof item === 'string') &&
    (value.timeFilter === 'fast' ||
      value.timeFilter === 'medium' ||
      value.timeFilter === 'all')
  )
}

function readJsonBody(request: import('node:http').IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = []
    let byteCount = 0
    let settled = false

    request.on('data', (chunk: Buffer | string) => {
      if (settled) return
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      byteCount += buffer.length
      if (byteCount > maxBodyBytes) {
        settled = true
        reject(new Error('Request body is too large.'))
        request.resume()
        return
      }
      chunks.push(buffer)
    })
    request.on('end', () => {
      if (settled) return
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('Request body must be valid JSON.'))
      }
    })
    request.on('aborted', () => {
      settled = true
      reject(new Error('Request was cancelled.'))
    })
    request.on('error', (error) => {
      settled = true
      reject(error)
    })
  })
}

function sendJson(
  response: import('node:http').ServerResponse,
  statusCode: number,
  payload: unknown,
) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

export function createRecipeApiServer(options: ServerOptions = {}) {
  return createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/api/recipes/generate') {
      sendJson(response, 404, { error: 'API route not found.' })
      return
    }

    const controller = new AbortController()
    request.on('aborted', () => controller.abort())
    response.on('close', () => {
      if (!response.writableEnded) controller.abort()
    })

    let body: unknown
    try {
      body = await readJsonBody(request)
    } catch (error) {
      if (controller.signal.aborted || response.destroyed) return
      const tooLarge =
        error instanceof Error && error.message === 'Request body is too large.'
      sendJson(
        response,
        tooLarge ? 413 : 400,
        { error: tooLarge ? error.message : 'Invalid recipe request.' },
      )
      return
    }

    if (!isRecipeRequest(body)) {
      sendJson(response, 400, { error: 'Invalid recipe request.' })
      return
    }
    const apiKey = options.apiKey ?? process.env.GROQ_API_KEY
    if (!apiKey) {
      sendJson(response, 503, {
        error: 'Recipe generation is not configured on the server.',
      })
      return
    }

    try {
      const result = await generateGroqRecipe(
        body.ingredients,
        body.timeFilter,
        { signal: controller.signal, apiKey, fetch: options.fetch },
      )
      if (!controller.signal.aborted && !response.destroyed) {
        sendJson(response, 200, result)
      }
    } catch (error) {
      if (controller.signal.aborted || response.destroyed) return
      sendJson(response, 502, {
        error: 'Recipe generation failed. Please try again.',
      })
      logRecipeError(error, 'route_handler')
    }
  })
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  createRecipeApiServer().listen(port, '127.0.0.1', () => {
    console.info(`[recipe-api] Listening on http://127.0.0.1:${port}`)
  })
}
