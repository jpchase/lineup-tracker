/** @format */
/* global process */

const isNode = !!(typeof process !== 'undefined' && process.version);

export const logger = (prefix: string): ((...args: unknown[]) => void) => {
  if (isNode) {
    // eslint-disable-next-line no-undef
    return require('debug')(`lineup:${prefix}`);
  }
  // eslint-disable-next-line no-console
  return (...logArgs: unknown[]): void => console.log(`lineup:${prefix}:`, ...logArgs);
};

export const logError = logger('error');
