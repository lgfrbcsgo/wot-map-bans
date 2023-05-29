import { Accessor, createEffect, createSignal, onCleanup, Signal } from "solid-js"

export function createWindowListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (e: WindowEventMap[K]) => void,
) {
  window.addEventListener(type, listener)
  onCleanup(() => window.removeEventListener(type, listener))
}

export function createDocumentListener<K extends keyof DocumentEventMap>(
  type: K,
  listener: (e: DocumentEventMap[K]) => void,
) {
  document.addEventListener(type, listener)
  onCleanup(() => document.removeEventListener(type, listener))
}

export function createPageVisible(): Accessor<boolean> {
  const [visibilityState, setVisibilityState] = createSignal(document.visibilityState)

  createDocumentListener("visibilitychange", () => setVisibilityState(document.visibilityState))

  return () => visibilityState() === "visible"
}

export type JsonValue =
  | null
  | number
  | string
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue }

export function createStoredSignal<T extends JsonValue>(key: string): Signal<T | undefined>
export function createStoredSignal<T extends JsonValue>(key: string, initialValue: T): Signal<T>
export function createStoredSignal<T extends JsonValue>(
  key: string,
  initialValue?: T,
): Signal<T | undefined> {
  const storedValue = localStorage.getItem(key)
  const [value, setValue] = createSignal<T | undefined>(
    storedValue !== null ? JSON.parse(storedValue) : initialValue,
  )

  createEffect(() => {
    const unwrappedValue = value()
    if (unwrappedValue === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(unwrappedValue))
    }
  })

  return [value, setValue]
}
