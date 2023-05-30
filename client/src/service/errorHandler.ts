import { onCleanup } from "solid-js"
import { wrapperError } from "../util/error"
import { createWindowListener } from "../util/browser"
import { Class } from "../util/types"

export interface ErrorHandler {
  attachListener<E extends Error>(cls: Class<E>, listener: (err: E) => void): void
}

export function createErrorHandler(): ErrorHandler {
  const listeners = new Set<(err: Error) => void>()

  function attachListener<E extends Error>(cls: Class<E>, listener: (err: E) => void) {
    const wrapper = (err: Error) => {
      if (err instanceof cls) listener(err)
    }
    listeners.add(wrapper)
    onCleanup(() => listeners.delete(wrapper))
  }

  function handleError(err: unknown) {
    const errorInstance = err instanceof Error ? err : new ThrownValue("A value was thrown", err)
    for (const listener of listeners) {
      listener(errorInstance)
    }
  }

  createWindowListener("error", e => handleError(e.error))
  createWindowListener("unhandledrejection", e => handleError(e.reason))

  return { attachListener }
}

export const ThrownValue = wrapperError("ThrownValue")
