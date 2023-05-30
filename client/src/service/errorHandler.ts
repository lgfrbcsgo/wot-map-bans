import { Accessor, createSignal, onCleanup } from "solid-js"
import { wrapperError } from "../util/error"
import { createWindowListener } from "../util/browser"
import { Class } from "../util/types"

export interface ErrorHandler {
  error: Accessor<Error | undefined>
  attachListener<E extends Error>(cls: Class<E>, listener: (err: E) => void): void
  dropError(): void
}

export function createErrorHandler(): ErrorHandler {
  const [error, setError] = createSignal<Error>()
  const listeners = new Set<(err: Error) => void>()

  function attachListener<E extends Error>(cls: Class<E>, listener: (err: E) => void) {
    const wrapper = (err: Error) => {
      if (err instanceof cls) listener(err)
    }
    listeners.add(wrapper)
    onCleanup(() => listeners.delete(wrapper))
  }

  function dropError() {
    setError(undefined)
  }

  function handleError(err: unknown) {
    const errorInstance = toErrorInstance(err)
    setError(errorInstance)
    for (const listener of listeners) {
      listener(errorInstance)
    }
  }

  createWindowListener("error", e => handleError(e.error))
  createWindowListener("unhandledrejection", e => handleError(e.reason))

  return { error, attachListener, dropError }
}

export const ThrownValue = wrapperError("ThrownValue")

function toErrorInstance(err: unknown): Error {
  if (err instanceof Error) {
    return err
  } else {
    return new ThrownValue("A value was thrown", err)
  }
}
