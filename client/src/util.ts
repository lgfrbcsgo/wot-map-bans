import { onCleanup } from "solid-js"

export function createEventListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (e: WindowEventMap[K]) => void,
) {
  window.addEventListener(type, listener)
  onCleanup(() => window.removeEventListener(type, listener))
}

type BaseErrorConstructor = new (options: { cause?: unknown }) => BaseError

export abstract class BaseError extends Error {
  static try<T>(this: BaseErrorConstructor, fn: () => Promise<T>): Promise<T>
  static try<T>(this: BaseErrorConstructor, fn: () => T): T
  static try<T>(this: BaseErrorConstructor, fn: (() => Promise<T>) | (() => T)): Promise<T> | T {
    try {
      const ret = fn()

      if (ret instanceof Promise) {
        return ret.catch(cause => {
          throw new this({ cause })
        })
      }

      return ret
    } catch (cause) {
      throw new this({ cause })
    }
  }
}
