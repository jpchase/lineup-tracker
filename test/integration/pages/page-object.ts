/**
@license
*/

import * as path from 'path';
import { BinaryScreenShotOptions, Browser, ConsoleMessage, Page, Request, Viewport } from 'puppeteer';
import { serveHermeticFont } from '../server/hermetic-fonts';
import { config } from '../server/test-server';
const puppeteer = require('puppeteer');

export interface PageOpenParams {
  route: string;
}

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

  protected get page(): Page {
    if (!this._page) {
      throw new Error('Page not initialized. Did you call init()?');
    }
    return this._page;
  }

  async init() {
    const browser = this._browser = await puppeteer.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });

    const page = this._page = await browser.newPage();

    page.on('console', (msg: ConsoleMessage) => console.log('PAGE LOG:', msg.text()));

    page.on('requestfailed', (request: Request) => {
      console.log('PAGE REQUEST FAIL: [' + request.url() + '] ' + request.failure()!.errorText);
    });

    page.setRequestInterception(true);
    page.on('request', async (request: Request) => {
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

    const testFlagSeparator = (this._route.includes('?')) ? '&' : '?';
    await this._page.goto(`${config.appUrl}/${this._route}${testFlagSeparator}test_data`);
    if (this.openFunc) {
      await this.openFunc();
    }
    await this._page.waitFor(1500);
  }

  // To be overridden.
  protected get openParams(): PageOpenParams {
    throw new Error('Method not implemented.');
  }

  protected get openFunc(): PageOpenFunction | undefined {
    return undefined;
  }

  async screenshot(directory?: string): Promise<string> {
    const viewName = this.scenarioName || this._route || 'index';
    const params: BinaryScreenShotOptions = {
      path: path.join(directory || '', `${viewName}.png`)
    };
    return this._page!.screenshot(params).then(() => viewName);
  }
}
