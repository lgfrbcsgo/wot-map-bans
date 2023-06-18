export class Option<T> {
  constructor(private readonly value: T) {}

  map<U>(fn: (value: NonNullable<T>) => U): Option<U | (T & (null | undefined))> {
    if (this.has()) {
      return new Option(fn(this.value))
    } else {
      return this as Option<T & (null | undefined)>
    }
  }

  flatMap<U>(fn: (value: NonNullable<T>) => Option<U>): Option<U | (T & (null | undefined))> {
    if (this.has()) {
      return fn(this.value)
    } else {
      return this as Option<T & (null | undefined)>
    }
  }

  filter<U extends NonNullable<T>>(
    fn: (value: NonNullable<T>) => value is U,
  ): Option<U | undefined | (T & null)>
  filter(fn: (value: NonNullable<T>) => boolean): Option<T | undefined>
  filter(fn: (value: NonNullable<T>) => boolean): Option<T | undefined> {
    if (!this.has()) {
      return this
    } else if (fn(this.value)) {
      return this
    } else {
      return new Option(undefined)
    }
  }

  forEach(fn: (value: NonNullable<T>) => void): void {
    if (this.has()) fn(this.value)
  }

  orElse<U>(fallback: U): NonNullable<T> | U {
    return this.has() ? this.value : fallback
  }

  has(): this is Option<NonNullable<T>> {
    return this.value !== undefined && this.value !== null
  }

  get(): T {
    return this.value
  }
}

export function option<T>(value: T) {
  return new Option(value)
}
