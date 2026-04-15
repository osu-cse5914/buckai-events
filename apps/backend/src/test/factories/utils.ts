type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type FixtureOverrides<T> = T extends Primitive
  ? T
  : T extends Date
    ? Date
    : T extends Array<infer Item>
      ? Array<FixtureOverrides<Item>>
      : T extends object
        ? { [Key in keyof T]?: FixtureOverrides<T[Key]> }
        : T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date)
  );
}

export function mergeFixture<T>(
  base: T,
  overrides: FixtureOverrides<T> = {} as FixtureOverrides<T>,
): T {
  if (!isPlainObject(overrides)) {
    return overrides as T;
  }

  const result = {
    ...(base as Record<string, unknown>),
  };

  for (const [key, value] of Object.entries(overrides)) {
    const current = result[key];

    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = mergeFixture(current, value);
      continue;
    }

    result[key] = value;
  }

  return result as T;
}
