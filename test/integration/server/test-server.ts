import * as os from 'os';
import * as path from 'path';
import { startDevServer } from '@web/dev-server';
import { DevServer } from '@web/dev-server-core';
export { DevServer };

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

export const config: IntegrationConfig = {
  appUrl: 'http://127.0.0.1:4444',
  dataDir: path.join(integrationDir, 'data'),
  currentDir: path.join(integrationDir, 'screenshots-current', platformName),
  baselineDir: path.join(integrationDir, 'screenshots-baseline', platformName),
}

export async function startTestServer(): Promise<DevServer> {
  return startDevServer({
    config: {
      port: 4444,
      rootDir: path.join(process.cwd(), 'dist'),
      appIndex: path.join(process.cwd(), 'dist/index.html'),
      nodeResolve: true,
    },
    readCliArgs: false,
    readFileConfig: false,
  });
}
