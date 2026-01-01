/** @format */

import { hermeticFontsPlugins } from './out-tsc/test/common/dev-server-plugins.js';
import { config } from './out-tsc/test/integration/server/test-server.js';

const offline = !!process.argv.find((value) => value === '--offline');
console.log(`Starting web-dev-server: ${offline ? 'offline enabled' : 'normal mode'}`);

/**
 * @typedef { import("@web/dev-server-core").Plugin } Plugin
 * @typedef { import('koa').Middleware } Middleware
 */

/**
 * @type {Array.<Plugin>}
 */
const plugins = [];
/**
 * @type {Array.<Middleware>}
 */
const middlewares = [];

if (offline) {
  // Add plugins to first replace the font urls with virtual placeholders in the source,
  // and serve offline content for the placeholders.
  const hermeticFonts = hermeticFontsPlugins(config.dataDir);
  plugins.push(hermeticFonts.plugin);
  middlewares.push(hermeticFonts.middleware);
}

/** @type {import('@web/dev-server').DevServerConfig} */
export default {
  port: 8080,
  debug: false,
  watch: true,
  nodeResolve: true,
  appIndex: 'local.index.html',
  middleware: middlewares,
  plugins,
};
