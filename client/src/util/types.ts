type Literal = string | number | boolean

type Tagged<T extends Literal> = T | { type: T }

export function hasType<T extends Literal, U extends T>(
  tagged: Tagged<T>,
  type: U,
): tagged is Tagged<U> {
  return typeof tagged === "object" ? tagged.type === type : tagged === type
}
