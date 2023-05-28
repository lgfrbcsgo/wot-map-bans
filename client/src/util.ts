import { createEffect, createSignal, onCleanup, Signal } from "solid-js"

export function createEventListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (e: WindowEventMap[K]) => void,
) {
  window.addEventListener(type, listener)
  onCleanup(() => window.removeEventListener(type, listener))
}

export function createStored(key: string): Signal<string | undefined> {
  const [value, setValue] = createSignal(localStorage.getItem(key) ?? undefined)

  createEffect(() => {
    const deref = value()
    if (deref === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, deref)
    }
  })

  return [value, setValue]
}

export interface CustomError<T> extends Error {
  readonly detail: T
}

export function customError<T>(
  name: string,
  getMessage: (detail: T) => string,
): new (detail: T) => CustomError<T> {
  class CustomError extends Error {
    constructor(readonly detail: T) {
      super(getMessage(detail))
      this.name = name
    }
  }
  return CustomError
}

export function wrapperError(name: string) {
  class WrapperError extends Error {
    constructor(message: string, readonly cause: unknown) {
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
            throw new WrapperError(message, cause)
          })
        }
        return ret
      } catch (cause) {
        throw new WrapperError(message, cause)
      }
    }
  }
  return WrapperError
}
