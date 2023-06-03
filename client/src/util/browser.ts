import { onCleanup } from "solid-js"

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

export function onPageVisible(listener: () => void) {
  function onVisibilityChange() {
    if (document.visibilityState === "visible") {
      listener()
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange)
  onCleanup(() => document.removeEventListener("visibilitychange", onVisibilityChange))

  onVisibilityChange()
}
