import { Accessor, createMemo, createSignal } from "solid-js"
import { Auth } from "./auth"
import { ApiResponseError } from "./api"
import { wrapperError } from "../util/error"
import { createWindowListener } from "../util/browser"

export interface ErrorHandler {
  errors: Accessor<Error[]>
  error: Accessor<Error | undefined>
  dropError(): void
  handleError(err: unknown): void
}

export function createErrorHandler(auth: Auth): ErrorHandler {
  const [errors, setErrors] = createSignal<Error[]>([])
  const error = createMemo(() => errors().at(0))

  function dropError() {
    setErrors(prev => prev.slice(1))
  }

  function handleError(err: unknown) {
    if (err instanceof ApiResponseError && err.detail.error === "InvalidBearerToken") {
      auth.invalidateToken()
    }
    setErrors(prev => [...prev, toError(err)])
  }

  createWindowListener("error", e => handleError(e.error))
  createWindowListener("unhandledrejection", e => handleError(e.reason))

  return { errors, error, dropError, handleError }
}

export const ThrownValue = wrapperError("ThrownValue")

function toError(err: unknown): Error {
  if (err instanceof Error) {
    return err
  } else {
    return new ThrownValue("A value was thrown", err)
  }
}
