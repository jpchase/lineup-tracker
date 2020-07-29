const os = require('os');
const path = require('path');
// import { startServer, ServerOptions } from 'polyserve';
const { startServer } = require('polyserve');
// import { createConfig, startServer } from 'es-dev-server';

// export interface TestServer {
//   close(): void;
// }

export interface IntegrationConfig {
  appUrl: string;
  dataDir: string;
  currentDir: string;
  baselineDir: string;
}

let platformName = os.type().toLowerCase();
if (platformName === 'darwin') {
  platformName = 'macos';
} else if (os.hostname() === 'penguin') {
  platformName = 'chromeos';
}

const integrationDir = path.join(process.cwd(), 'test/integration');

const config: IntegrationConfig = {
  appUrl: 'http://127.0.0.1:4444',
  dataDir: path.join(integrationDir, 'data'),
  currentDir: path.join(integrationDir, 'screenshots-current', platformName),
  baselineDir: path.join(integrationDir, 'screenshots-baseline', platformName),
}

const startTestServer = async function (): Promise<import("net").Server> {
  const config /*: ServerOptions */ = {
    port: 4444,
    root:  path.join(process.cwd(), 'dist'),
    moduleResolution: 'node',
  };
  return startServer(config);
}

exports.config = config;
exports.startTestServer = startTestServer;
