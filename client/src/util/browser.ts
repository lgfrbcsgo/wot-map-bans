import { Accessor, createSignal, onCleanup } from "solid-js"

export function onWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  listener: (e: WindowEventMap[K]) => void,
) {
  window.addEventListener(type, listener)
  onCleanup(() => window.removeEventListener(type, listener))
}

export function onUnhandledError(listener: (err: unknown) => void) {
  onWindowEvent("error", e => listener(e.error))
  onWindowEvent("unhandledrejection", e => listener(e.reason))
}

export function createPageVisibility(): Accessor<boolean> {
  const [visibility, setVisibility] = createSignal(document.visibilityState)

  const onVisibilityChange = () => setVisibility(document.visibilityState)
  document.addEventListener("visibilitychange", onVisibilityChange)
  onCleanup(() => document.removeEventListener("visibilitychange", onVisibilityChange))

  return () => visibility() === "visible"
}
