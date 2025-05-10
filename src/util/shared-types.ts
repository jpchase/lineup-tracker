/** @format */

// Used (mostly) to make mixin types work.
export type Constructor<T = {}> = new (...args: any[]) => T;

// Use for exhaustive checks in if/switch statements.
export function exhaustiveGuard(_value: never): never {
  throw new Error(
    `Reached forbidden guard function with unexpected value: ${JSON.stringify(_value)}`,
  );
}
