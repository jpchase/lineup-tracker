/** @format */

// import debug_package from 'debug';

const isNode = !!(typeof process !== 'undefined' && process.version);

export const debug = (prefix: string): ((...args: unknown[]) => void) => {
  // return debug_package(`lineup:${prefix}`);
  if (isNode) {
    // eslint-disable-next-line global-require
    return require('debug')(`lineup:${prefix}`);
  }
  return (...logArgs: unknown[]): void => console.log(`lineup:${prefix}:`, ...logArgs);
};

export const debugError = debug('error');
