import { FONT_APIS_PLACEHOLDER, FONT_STATIC_PLACEHOLDER, serveHermeticFontDevServer } from './test/integration/server/hermetic-fonts.js';
import { config } from './test/integration/server/test-server.js';

const offline = !!process.argv.find(value => (value === '--offline'));
console.log(`Starting web-dev-server: ${offline ? 'offline enabled' : 'normal mode'}`);

/**
 * @typedef { import("@web/dev-server-core").Plugin } Plugin
 * @typedef { import("@web/dev-server-core").Context } Context
 */

/**
 * @type {Array.<Plugin>}
 */
const plugins = [];

if (offline) {
  // Add plugins to first replace the font urls with virtual placeholders in the source,
  // and serve offline content for the placeholders.
  plugins.push(
    {
      name: 'replace-fonts-urls',
      /**
       * @param {Context} context
       */
      transform(context) {
        if (context.response.is('html')) {
          return { body: context.body.replace('https://fonts.googleapis.com/', FONT_APIS_PLACEHOLDER) };
        }
        if (context.response.is('css') &&
          context.request.path.startsWith(FONT_APIS_PLACEHOLDER)) {
          return { body: context.body.replace('https://fonts.gstatic.com/', FONT_STATIC_PLACEHOLDER) };
        }
      },
    },
    {
      name: 'hermetic-fonts',
      serve(context) {
        if (context.url.startsWith('/node_modules/') || context.url.startsWith('/src/')) {
          return;
        }
        // console.log(`\nURL is: ${context.url}, headers = ${JSON.stringify(context.req.headers)}`);
        return serveHermeticFontDevServer(context, config.dataDir);
      }
    }
  );
}

export default {
  port: 8080,
  watch: true,
  nodeResolve: true,
  appIndex: 'local.index.html',
  plugins
};
