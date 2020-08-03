import * as os from 'os';
import * as path from 'path';
import { startServer, ServerOptions } from 'polyserve';

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

export async function startTestServer(): Promise<import("net").Server> {
  const config: ServerOptions = {
    port: 4444,
    root: path.join(process.cwd(), 'dist'),
    moduleResolution: 'node',
  };
  return startServer(config);
}
