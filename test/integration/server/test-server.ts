/** @format */
/* global process */

import * as os from 'os';
import * as path from 'path';
import { Viewport } from 'puppeteer';

export interface BreakpointConfig {
  name: 'narrow' | 'wide';
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
  appUrl: 'http://127.0.0.1:8791',
  dataDir: path.join(integrationDir, 'data'),
  currentDir: path.join(integrationDir, 'screenshots-current', platformName),
  baselineDir: path.join(integrationDir, 'screenshots-baseline', platformName),
  breakpoints: [
    { name: 'wide', viewPort: { width: 800, height: 600 } },
    { name: 'narrow', viewPort: { width: 375, height: 667 } },
  ],
};
