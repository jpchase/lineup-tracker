import { serveHermeticFontDevServer } from './test/integration/server/hermetic-fonts.js';
import { config } from './test/integration/server/test-server.js';

export default {
  port: 8080,
  nodeResolve: true,
  appIndex: 'src/local.index.html',
  middleware: [
    function rewriteIndex(context, next) {
      if (context.url === '/' || context.url === '/index.html') {
        context.url = '/src/local.index.html';
      }
      return next();
    },
  ],
  plugins: [{
    name: 'hermetic-fonts',
    serve(context) {
      if (context.url.startsWith('/node_modules/') || context.url.startsWith('/src/')) {
        return;
      }
      console.log(`\nURL is: ${context.url}, headers = ${JSON.stringify(context.req.headers)}`);
      return serveHermeticFontDevServer(context, config.dataDir);
    }
  }
  ]
};
