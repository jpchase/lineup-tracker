const path = require('path');
// import { startServer, ServerOptions } from 'polyserve';
const { startServer, ServerOptions } = require('polyserve');
// import { createConfig, startServer } from 'es-dev-server';

// export interface TestServer {
//   close(): void;
// }

const startTestServer = async function (): Promise<import("net").Server> {
  const config /*: ServerOptions */ = {
    port: 4444,
    root:  path.join(process.cwd(), 'dist'),
    moduleResolution: 'node',
  };
  return startServer(config);
}

exports.startTestServer = startTestServer;
