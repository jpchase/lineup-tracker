/** @format */
// Import in advance to avoid timeouts using the `accessible` helper. Timeouts
// can occur because the `accessible` helper attempts to dynamically import the
// 'axe-core', which can happen concurrently during test execution. In theory,
// the concurrent imports should work fine, but it seems to cause random timeouts
// when an import doesn't complete.
import 'axe-core/axe.min.js';

// WORKAROUND for immer.js esm (see https://github.com/immerjs/immer/issues/557)
if (typeof window === 'object') {
  ((window.process ??= <any>{}).env ??= {}).NODE_ENV ??= 'production';
}
