import { Accessor, createSignal, onCleanup } from "solid-js"

export function createWindowListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (e: WindowEventMap[K]) => void,
) {
  window.addEventListener(type, listener)
  onCleanup(() => window.removeEventListener(type, listener))
}

export function createPageVisibilityListener(): Accessor<boolean> {
  const [visibilityState, setVisibilityState] = createSignal(document.visibilityState)

  const onVisibilityChange = () => setVisibilityState(document.visibilityState)
  document.addEventListener("visibilitychange", onVisibilityChange)
  onCleanup(() => document.removeEventListener("visibilitychange", onVisibilityChange))

  return () => visibilityState() === "visible"
}

export function createErrorHandler(handleError: (err: unknown) => void) {
  createWindowListener("error", e => handleError(e.error))
  createWindowListener("unhandledrejection", e => handleError(e.reason))
}
