import { onCleanup } from "solid-js"

export function createEventListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (e: WindowEventMap[K]) => void,
) {
  window.addEventListener(type, listener)
  onCleanup(() => window.removeEventListener(type, listener))
}

export function customError<T>(name: string, getMessage: (detail: T) => string) {
  class CustomError extends Error {
    constructor(readonly detail: T) {
      super(getMessage(detail))
      this.name = name
    }
  }
  return CustomError
}

export function errorWrapper(name: string) {
  class ErrorWrapper extends Error {
    private constructor(message: string, readonly cause: unknown) {
      super(message)
      this.name = name
    }

    static try<T>(message: string, fn: () => Promise<T>): Promise<T>
    static try<T>(message: string, fn: () => T): T
    static try<T>(message: string, fn: (() => Promise<T>) | (() => T)): Promise<T> | T {
      try {
        const ret = fn()
        if (ret instanceof Promise) {
          return ret.catch(cause => {
            throw new ErrorWrapper(message, cause)
          })
        }
        return ret
      } catch (cause) {
        throw new ErrorWrapper(message, cause)
      }
    }
  }
  return ErrorWrapper
}
