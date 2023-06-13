/** @format */

// Used (mostly) to make mixin types work.
export type Constructor<T = {}> = new (...args: any[]) => T;
