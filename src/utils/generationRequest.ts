interface GenerationControllerRef {
  current: AbortController | null
}

export function startGenerationRequest(
  controllerRef: GenerationControllerRef,
): AbortController | null {
  if (controllerRef.current) return null

  const controller = new AbortController()
  controllerRef.current = controller
  return controller
}
