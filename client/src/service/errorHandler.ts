import { Accessor, createMemo, createSignal } from "solid-js"
import { createEventListener } from "../util"

export interface ErrorHandler {
  errors: Accessor<ErrorMessage[]>
  error: Accessor<ErrorMessage | undefined>
  dropError(): void
  handleError(err: unknown): void
}

export interface ErrorMessage {
  title: string
  detail?: string
}

export function createErrorHandler(): ErrorHandler {
  const [errors, setErrors] = createSignal<ErrorMessage[]>([])
  const error = createMemo(() => errors().at(0))

  function dropError() {
    setErrors(prev => prev.slice(1))
  }

  function handleError(err: unknown) {
    setErrors(prev => [...prev, toErrorMessage(err)])
  }

  createEventListener("error", e => handleError(e.error))
  createEventListener("unhandledrejection", e => handleError(e.reason))

  return { errors, error, dropError, handleError }
}

function toErrorMessage(_err: unknown): ErrorMessage {
  return { title: "Something went wrong" } // TODO
}
