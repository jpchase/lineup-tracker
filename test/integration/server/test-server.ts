import * as os from 'os';
import * as path from 'path';
import { startDevServer } from '@web/dev-server';
import { DevServer } from '@web/dev-server-core';
import { Viewport } from 'puppeteer';
export { DevServer };

export interface BreakpointConfig {
  name: string;
  viewPort: Viewport;
}

export interface IntegrationConfig {
  appUrl: string;
  dataDir: string;
  currentDir: string;
  baselineDir: string;
  breakpoints: BreakpointConfig[];
}

let platformName = os.type().toLowerCase();
if (platformName === 'darwin') {
  platformName = 'macos';
} else if (os.hostname() === 'penguin') {
  platformName = 'chromeos';
}

const integrationDir = path.join(process.cwd(), 'test/integration');

export const config: IntegrationConfig = {
  appUrl: 'http://127.0.0.1:4444',
  dataDir: path.join(integrationDir, 'data'),
  currentDir: path.join(integrationDir, 'screenshots-current', platformName),
  baselineDir: path.join(integrationDir, 'screenshots-baseline', platformName),
  breakpoints: [
    { name: 'wide', viewPort: { width: 800, height: 600 } },
    { name: 'narrow', viewPort: { width: 375, height: 667 } },
  ]
}

export async function startTestServer(): Promise<DevServer> {
  return startDevServer({
    config: {
      port: 4444,
      rootDir: path.join(process.cwd(), 'dist'),
      appIndex: path.join(process.cwd(), 'dist/index.html'),
      nodeResolve: true,

    },
    logStartMessage: false,
    readCliArgs: false,
    readFileConfig: false,
  });
}
