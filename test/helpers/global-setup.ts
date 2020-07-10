// WORKAROUND for immer.js esm (see https://github.com/immerjs/immer/issues/557)
// @ts-ignore
window.process = { env: { NODE_ENV: 'production' } };
