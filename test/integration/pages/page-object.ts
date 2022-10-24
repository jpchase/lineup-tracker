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
  userId?: string;
  team?: TeamOptions;
  gameId?: string;
  viewPort?: Viewport
}

export interface OpenOptions {
  signIn?: boolean;
}

export interface TeamOptions {
  teamId: string;
}

enum PageLoadType {
  Navigation,
  Reload
}

export class PageObject {
  private _browser?: Browser;
  private _page?: Page;
  protected readonly scenarioName: string;
  private readonly _route: string;
  private readonly _viewPort?: Viewport;

  constructor(options: PageOptions = {}) {
    this.scenarioName = options.scenarioName || '';
    this._route = buildRoute(options);
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

  async open(options: OpenOptions = {}) {
    if (this._viewPort) {
      this.page.setViewport(this._viewPort);
    }

    await this.page.goto(`${config.appUrl}/${this._route}`);
    await this.waitForLoad(PageLoadType.Navigation, options);
  }

  async reload(options: OpenOptions = {}) {
    await this.page.reload();
    await this.waitForLoad(PageLoadType.Reload, options);
  }

  private async waitForLoad(_loadType: PageLoadType, options: OpenOptions = {}) {
    await this.waitForAppInitialization();
    if (options.signIn) {
      await this.signin();
      await this.waitForTeamsLoaded();
    }
    if (this.openFunc) {
      await this.openFunc();
    }
    await this.page.waitForTimeout(1500);
  }

  async waitForAppInitialization() {
    await this.page.waitForSelector('body[data-app-initialized]',
      { timeout: 10000 });
  }

  private async getMainElementDataset() {
    return await this.page.evaluate(async () => {
      const app = document.querySelector('lineup-app');
      const mainElement = app?.shadowRoot?.querySelector('mwc-drawer > div[slot=appContent] > main');
      if (mainElement) {
        const teamsLoaded = (mainElement as HTMLElement).dataset.teamsLoaded;
        console.log(`main data attributes: ${teamsLoaded}`);
        return Object.fromEntries(Object.entries((mainElement as HTMLElement).dataset));
      }
      return undefined;
    });
  }

  private async waitForTeamsLoadedManual() {
    let loaded = false;
    console.time('wait for teams-loaded');
    let attempts = 0;
    const maxAttempts = 15;
    for (; attempts < maxAttempts; attempts++) {
      const mainDataset = await this.getMainElementDataset();
      if (mainDataset) {
        const teamsLoadedValue = mainDataset.teamsLoaded;
        console.log(`[Attempt ${attempts + 1}] teams loaded value: ${teamsLoadedValue}`);
        if (teamsLoadedValue === 'true') {
          attempts++;
          loaded = true;
          break;
        }
      }
      if (attempts < maxAttempts - 1) {
        console.timeLog('wait for teams-loaded');
        await this.page.waitForTimeout(200);
      }
    }
    console.timeEnd('wait for teams-loaded');
    console.log(`done waiting for teams, loaded = ${loaded}, attempts = ${attempts}`);
    if (!loaded) {
      throw new Error(`Teams not loaded after ${attempts} attempts`);
    }
  }

  async waitForTeamsLoaded() {
    await this.waitForTeamsLoadedManual();
    /*
    const mainElement = await this.page.evaluate(async () => {
      const app = document.querySelector('lineup-app');
      const mainElement = app?.shadowRoot?.querySelector('mwc-drawer > div[slot=appContent] > main');
      if (mainElement) {
        const teamsLoaded = (mainElement as HTMLElement).dataset.teamsLoaded;
        console.log(`main data attributes: ${teamsLoaded}`);
        return mainElement as HTMLElement;
      }
      return undefined;
    });
    */
    /*
    let mainDataset = await this.getMainElementDataset();
    if (mainDataset) {
      const teamsLoadedValue = mainDataset.teamsLoaded;
      console.log(`teams loaded value: ${teamsLoadedValue}`);
      if (teamsLoadedValue === 'true') {
        return;
      }
    }
    const appHandle = await this.page.$('lineup-app');
    console.time('wait for teams-loaded');
    try {
      await this.page.waitForSelector('.teams-loaded',
        { root: appHandle || undefined, timeout: 10000 });
    } catch (e) {
      console.log(`error in waitForSelector: ${(e as Error).message}`);
      console.timeLog('wait for teams-loaded');
    }
    console.timeEnd('wait for teams-loaded');
    await this.page.waitForTimeout(2000);
    console.log('done waiting: ' + new Date().toTimeString());
    mainDataset = await this.getMainElementDataset();
    console.log(`teams loaded value 2: ${mainDataset?.teamsLoaded}`);
    */
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

  async querySelectorInView(viewName: string, selector: string) {
    const viewHandle = await this.page.$(`pierce/${viewName}`);
    if (!viewHandle) {
      throw new Error(`View not found: ${viewName}`);
    }
    return viewHandle.$(`pierce/${selector}`);
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

function buildRoute(options: PageOptions) {
  console.log(`buildRoute: options = ${JSON.stringify(options)}`);
  let params: URLSearchParams;
  const routeParts = (options.route || '').split('?');
  if (routeParts.length === 1) {
    // No params in route.
    params = new URLSearchParams();
  } else {
    params = new URLSearchParams(routeParts[1]);
  }

  // Add the userId to the route, if necessary.
  if (options.userId && !params.has('user')) {
    params.append('user', options.userId);
  }

  // Add the team to the route, if necessary.
  if (options.team?.teamId && !params.has('team')) {
    params.append('team', options.team.teamId);
  }

  let finalRoute = routeParts[0];
  const paramsString = params.toString();
  if (paramsString.length > 0) {
    finalRoute += `?${paramsString}`;
  }
  console.log(`buildRoute: result = ${finalRoute}`);
  return finalRoute;
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
