/**
@license
*/

import { AxePuppeteer } from '@axe-core/puppeteer';
import { AxeResults } from 'axe-core';
import * as path from 'path';
import puppeteer, { Browser, ConsoleMessage, ElementHandle, HTTPRequest, Page, ScreenshotOptions, Viewport } from 'puppeteer';
import { serveHermeticFont } from '../server/hermetic-fonts.js';
import { config } from '../server/test-server.js';

export type PageOpenFunction = () => Promise<void>;

export interface PageOptions {
  scenarioName?: string;
  route?: string;
  viewPort?: Viewport
}

export class PageObject {
  private _browser?: Browser;
  private _page?: Page;
  protected readonly scenarioName: string;
  private readonly _route: string;
  private readonly _viewPort?: Viewport;

  constructor(options: PageOptions = {}) {
    this.scenarioName = options.scenarioName || '';
    this._route = options.route || '';
    this._viewPort = options.viewPort;
  }

  get currentRoute(): string {
    const url = new URL(this.page.url());
    return url.pathname.slice(1);
  }

  get page(): Page {
    if (!this._page) {
      throw new Error('Page not initialized. Did you call init()?');
    }
    return this._page;
  }

  async init() {
    const browser = this._browser = await puppeteer.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });

    const page = this._page = await browser.newPage();

    page.on('console', (msg: ConsoleMessage) => console.log('PAGE LOG:', msg.text()));

    page.on('pageerror', (error: Error) => console.log(`PAGE ERROR: ${error}`));

    page.on('requestfailed', (request: HTTPRequest) => {
      console.log('PAGE REQUEST FAIL: [' + request.url() + '] ' + request.failure()!.errorText);
    });

    page.setRequestInterception(true);
    page.on('request', async (request: HTTPRequest) => {
      const fontResponse = serveHermeticFont(request, config.dataDir);
      if (fontResponse) {
        request.respond(fontResponse);
      } else {
        request.continue();
      }
    });

    await page.emulateTimezone('America/Toronto');
  }

  async close() {
    await this._browser?.close();
  }

  async open() {
    if (!this._page) {
      throw new Error('Page not initialized. Did you call init()?');
    }

    if (this._viewPort) {
      this._page.setViewport(this._viewPort);
    }

    await this._page.goto(`${config.appUrl}/${this._route}`);
    if (this.openFunc) {
      await this.openFunc();
    } else {
      await this.waitForAppInitialization();
    }
    await this._page.waitForTimeout(1500);
  }

  async waitForAppInitialization() {
    await this.page.waitForSelector('body[data-app-initialized]',
      { timeout: 10000 });
  }

  async signin() {
    const buttonHandle = await this.page.evaluateHandle(`(async () => {
      console.log('get signin button');
      const signinButton = document.querySelector('lineup-app').shadowRoot.querySelector('button.signin-btn');
      return signinButton;
    })()`) as ElementHandle;
    await buttonHandle.click();
    // TODO: Is this wait needed to let promises resolve, or does the sign in actually need the time.
    await this.page.waitForTimeout(100);
  }

  protected get openFunc(): PageOpenFunction | undefined {
    return undefined;
  }

  async screenshot(directory?: string): Promise<string> {
    const viewName = this.scenarioName || this._route || 'unknown';
    const params: ScreenshotOptions = {
      path: path.join(directory || '', `${viewName}.png`)
    };
    return this.page.screenshot(params).then(() => viewName);
  }

  async checkAccessibility(): Promise<{ results: AxeResults, violationCount: number, violationMessage: string }> {
    const axe = new AxePuppeteer(this.page)
      .disableRules(['aria-allowed-role', 'aria-dialog-name', 'color-contrast', 'list', 'landmark-one-main', 'page-has-heading-one']);
    return axe.analyze().then((results) => {
      return {
        results,
        violationCount: results.violations.length,
        violationMessage: processAxeResults(results)
      };
    });
  }
}

function processAxeResults(results: AxeResults) {
  const { violations } = results;

  const messages = [];
  if (violations.length) {
    messages.push('Accessibility Violations');
    messages.push('---');
    violations.forEach(violation => {
      messages.push(`Rule: ${violation.id}`);
      messages.push(`Impact: ${violation.impact}`);
      messages.push(`${violation.help} (${violation.helpUrl})`);
      violation.nodes.forEach(node => {
        messages.push('');
        if (node.target) {
          messages.push(`Issue target: ${node.target}`);
        }
        messages.push(`Context: ${node.html}`);
        if (node.failureSummary) {
          messages.push(`${node.failureSummary}`);
        }
      });
      messages.push('---');
    });
  }

  return messages.join('\n');
}
