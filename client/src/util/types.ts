type Literal = string | number | boolean

type Tagged<L extends Literal> = L | { type: L }

type Tags<T extends Tagged<Literal>> = T extends Tagged<infer L> ? L : never

export function getType<L extends Literal>(tagged: Tagged<L>): L {
  return typeof tagged === "object" ? tagged.type : tagged
}

export function hasType<T extends Tagged<Literal>, L extends Tags<T>>(
  tagged: T,
  type: L,
): tagged is Extract<T, Tagged<L>> {
  return getType(tagged) === type
}

export function unwrapType<T extends Tagged<Literal>, L extends Tags<T>>(
  tagged: T,
  type: L,
): Extract<T, Tagged<L>> | undefined {
  if (hasType(tagged, type)) {
    return tagged
  }
}
