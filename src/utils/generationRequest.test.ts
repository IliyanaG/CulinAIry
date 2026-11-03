import { describe, expect, it } from 'vitest'
import { startGenerationRequest } from './generationRequest'

describe('generation request guard', () => {
  it('allows only one in-flight request until the active request is released', () => {
    const controllerRef: { current: AbortController | null } = {
      current: null,
    }

    const firstController = startGenerationRequest(controllerRef)

    expect(firstController).toBeInstanceOf(AbortController)
    expect(startGenerationRequest(controllerRef)).toBeNull()
    expect(controllerRef.current).toBe(firstController)

    controllerRef.current = null
    expect(startGenerationRequest(controllerRef)).toBeInstanceOf(AbortController)
  })
})
