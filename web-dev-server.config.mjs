/** @format */

import * as path from 'path';
import {
  FONT_APIS_HOSTNAME,
  FONT_APIS_PLACEHOLDER,
  FONT_STATIC_PLACEHOLDER,
  serveHermeticFontDevServer,
} from './out-tsc/test/integration/server/hermetic-fonts.js';
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

/**
 * @param {string} dataDir
 */
function hermeticFontsPlugins(dataDir) {
  /**
   * @type {Array.<Plugin>}
   */
  const fontPlugins = [];

  fontPlugins.push({
    name: 'hermetic-fonts',
    transform(context) {
      if (context.response.is('html')) {
        return {
          body: context.body.replace(`https://${FONT_APIS_HOSTNAME}/`, FONT_APIS_PLACEHOLDER),
        };
      }
      if (context.response.is('css') && context.request.path.startsWith(FONT_APIS_PLACEHOLDER)) {
        return {
          body: context.body.replace(`https://${FONT_STATIC_HOSTNAME}/`, FONT_STATIC_PLACEHOLDER),
        };
      }
    },
    serve(context) {
      if (
        context.url.startsWith('/node_modules/') ||
        context.url.startsWith('/src/') ||
        context.url.startsWith('/out-tsc/src/')
      ) {
        return;
      }
      // console.log(`\nhermetic-fonts[${serveCounter}]: attempt to serve for URL = ${context.url}`);
      return serveHermeticFontDevServer(context, dataDir);
    },
  });

  return {
    /**
     * @type {Array.<Plugin>}
     */
    plugins: fontPlugins,
    /**
     * @type {Middleware}
     */
    middleware: (context, next) => {
      // Using `appIndex` in the WDS config causes it to intercept *all* non-file
      // requests, including the CSS requests. This middleware is needed to run
      // before that interception and serve the CSS correctly.
      if (context.method !== 'GET' || path.extname(context.path)) {
        // not a GET, or a direct file request
        return next();
      }

      if (!context.path.startsWith(FONT_APIS_PLACEHOLDER)) {
        return next();
      }

      const response = serveHermeticFontDevServer(context, dataDir);
      if (!response) {
        return next();
      }
      if (response.headers) {
        for (const [k, v] of Object.entries(response.headers)) {
          context.response.set(k, v);
        }
      }
      context.response.body = response.body;
      context.response.status = response.status;
      context.response.type = response.contentType;
    },
  };
}

if (offline) {
  // Add plugins to first replace the font urls with virtual placeholders in the source,
  // and serve offline content for the placeholders.
  const hermeticFonts = hermeticFontsPlugins(config.dataDir);
  plugins.push(...hermeticFonts.plugins);
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
