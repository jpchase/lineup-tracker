// WORKAROUND for immer.js esm (see https://github.com/immerjs/immer/issues/557)
if (typeof window === 'object') {
  ((window.process ??= <any>{}).env ??= {}).NODE_ENV ??= 'production';
}
