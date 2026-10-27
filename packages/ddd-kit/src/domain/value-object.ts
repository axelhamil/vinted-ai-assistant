import type { Result } from "../primitives/result";

function inKeyOrder(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(inKeyOrder);
  if (typeof value !== "object" || value === null || value instanceof Date)
    return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => [key, inKeyOrder(entry)]),
  );
}

export function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(inKeyOrder(left)) === JSON.stringify(inKeyOrder(right));
}

export abstract class ValueObject<T> {
  protected readonly _value: T;

  public constructor(value: T) {
    this._value = Object.freeze(value);
  }

  get value(): T {
    return this._value;
  }

  public equals(other: ValueObject<T>): boolean {
    if (this._value === other.value) return true;
    if (
      typeof this._value === "object" &&
      this._value !== null &&
      typeof other.value === "object" &&
      other.value !== null
    ) {
      return sameJson(this._value, other.value);
    }
    return false;
  }

  protected abstract validate(value: T): Result<T>;

  public static create<T extends ValueObject<V>, V>(
    this: new (
      value: V,
    ) => T,
    value: NoInfer<V>,
  ): Result<T> {
    // biome-ignore lint/complexity/noThisInStatic: Need `this` to create instance of subclass
    const ValueObjectConstructor = this as new (value: V) => T;

    const candidate = new ValueObjectConstructor(value);

    return candidate
      .validate(value)
      .map((validated) =>
        Object.is(validated, value)
          ? candidate
          : new ValueObjectConstructor(validated),
      );
  }
}
