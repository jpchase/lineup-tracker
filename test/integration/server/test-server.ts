const path = require('path');
// import { startServer, ServerOptions } from 'polyserve';
const { startServer, ServerOptions } = require('polyserve');
// import { createConfig, startServer } from 'es-dev-server';

// export interface TestServer {
//   close(): void;
// }
const appUrl = 'http://127.0.0.1:4444';

const startTestServer = async function (): Promise<import("net").Server> {
  const config /*: ServerOptions */ = {
    port: 4444,
    root:  path.join(process.cwd(), 'dist'),
    moduleResolution: 'node',
  };
  return startServer(config);
}

exports.appUrl = appUrl;
exports.startTestServer = startTestServer;
