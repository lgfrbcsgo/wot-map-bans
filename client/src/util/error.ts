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

export function contextualizedError(name: string) {
  class ContextualizedError extends Error {
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
            throw new ContextualizedError(message, cause)
          })
        }
        return ret
      } catch (cause) {
        throw new ContextualizedError(message, cause)
      }
    }
  }

  return ContextualizedError
}
