import { AxePuppeteer } from '@axe-core/puppeteer';
import { AxeResults } from 'axe-core';
import * as path from 'path';
import puppeteer, { Browser, ConsoleMessage, ElementHandle, HTTPRequest, Page, ScreenshotOptions, Viewport } from 'puppeteer';
import { integrationTestData } from '../data/integration-data-constants.js';
import { serveHermeticFont } from '../server/hermetic-fonts.js';
import { config } from '../server/test-server.js';

const APP_COMPONENT_NAME = 'lineup-app';

export type PageOpenFunction = () => Promise<void>;

export interface PageOptions {
  scenarioName?: string;
  route?: string;
  // Name of the page view component (e.g. lineup-view-*)
  componentName?: string;
  userId?: string;
  team?: TeamOptions;
  gameId?: string;
  viewPort?: Viewport
}

export interface OpenOptions {
  signIn?: boolean;
  ignoreTeamOption?: boolean;
  skipWaitForReady?: boolean;
}

export interface TeamOptions {
  teamId: string;
  teamName?: string;
}

enum PageLoadType {
  Navigation,
  Reload
}

export type PageConstructor<T extends PageObject> = new (options: PageOptions) => T;

export class PageObject {
  private _browser?: Browser;
  private _page?: Page;
  readonly scenarioName: string;
  readonly componentName?: string;
  private readonly _route: string;
  private readonly _viewPort?: Viewport;

  constructor(options: PageOptions = {}) {
    this.scenarioName = options.scenarioName || '';
    this._route = buildRoute(options);
    this._viewPort = options.viewPort;
    this.componentName = options.componentName;
  }

  get currentRoute(): string {
    const url = new URL(this.page.url());
    return url.pathname.slice(1);
  }

  get timeZoneId(): string {
    return 'America/Toronto';
  }

  get page(): Page {
    if (!this._page) {
      throw new Error('Page not initialized. Did you call init()?');
    }
    return this._page;
  }

  // Derived classes can override to provide custom logic for when
  // the page has completed loading/rendering.
  protected get openFunc(): PageOpenFunction | undefined {
    return undefined;
  }

  protected log(message: string) {
    // TODO: Add ability to turn off for certain pages?
    logWithTime(message);
  }

  async init() {
    const browser = this._browser = await puppeteer.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
    // const browser = this._browser = await puppeteer.launch({
    //   args: ['--disable-gpu', '--font-render-hinting=none'], headless: false,
    //   devtools: true,
    // });

    const page = this._page = await browser.newPage();

    page.on('console', (msg: ConsoleMessage) => logWithTime(msg.text(), 'PAGE LOG'));

    page.on('pageerror', (error: Error) => logWithTime(`${error}`, 'PAGE ERROR'));

    page.on('requestfailed', (request: HTTPRequest) => {
      const response = request.response();
      logWithTime(`PAGE REQUEST FAIL: ${response?.status()} ${request.failure()!.errorText} [${request.url()}] ${JSON.stringify(response?.timing())}`);
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

    await page.emulateTimezone(this.timeZoneId);
  }

  // Transfers the existing puppeteer instance to a different logical page.
  // Use when interaction with the page causes a different logical view to become
  // active, and it's not necessary/desirable to initialize a new instance.
  // After the swap, this page object will no longer be valid or connected to
  // puppeteer.
  swap<T extends PageObject>(targetPageType: PageConstructor<T>, options: PageOptions = {}): T {
    const newPage = new targetPageType(options);
    newPage._browser = this._browser;
    newPage._page = this._page;
    this._browser = undefined;
    this._page = undefined;
    return newPage;
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
    if (options.ignoreTeamOption) {
      const url = new URL(this.page.url());
      if (url.searchParams.has('team')) {
        url.searchParams.delete('team');
      }
      const reloadUrl = url.toString();
      this.log(`Reload modified url ${reloadUrl}, was ${this.page.url()}`);
      await this.page.goto(reloadUrl);
    } else {
      await this.page.reload();
    }
    await this.waitForLoad(PageLoadType.Reload, options);
  }

  private async waitForLoad(_loadType: PageLoadType, options: OpenOptions = {}) {
    await this.waitForAppInitialization();
    if (options.signIn) {
      await this.signin();
    }
    if (!options.skipWaitForReady) {
      await this.waitForViewReady();
    }
    if (this.openFunc) {
      await this.openFunc();
    }
    if (!this.componentName) {
      this.log(`waitForLoad: last wait for timeout`);
      await this.page.waitForTimeout(1500);
    }
    this.log(`waitForLoad: finished`);
  }

  async waitForAppInitialization() {
    this.log(`waitForAppInitialization: start`);
    await this.page.waitForSelector('body[data-app-initialized]',
      { timeout: 10000 });
  }

  async waitForViewReady() {
    if (!this.componentName) {
      this.log(`waitForViewReady: no component name`);
      return;
    }
    this.log(`waitForViewReady: get main element`);
    const main = await this.getMainElement();
    this.log(`waitForViewReady: start for ${this.componentName}`);
    await main.waitForSelector(`pierce/${this.componentName}[ready]`,
      { timeout: 6000 });
  }

  private async getMainElement() {
    const appHandle = await this.page.$(`pierce/${APP_COMPONENT_NAME}`);
    if (!appHandle) {
      throw new Error(`App element not found: ${APP_COMPONENT_NAME}`);
    }
    const mainHandle = await appHandle.$('pierce/mwc-drawer > div[slot=appContent] > main');
    if (!mainHandle) {
      throw new Error('Main element not found');
    }
    return mainHandle!;
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
        this.log(`[Attempt ${attempts + 1}] teams loaded value: ${teamsLoadedValue}`);
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
    this.log(`done waiting for teams, loaded = ${loaded}, attempts = ${attempts}`);
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

  async getTimezoneOffset(): Promise<number> {
    return await this.page.evaluate(() => {
      return new Date().getTimezoneOffset();
    });
  }

  async getCurrentTeam() {
    // this.exposeGetTeamSelectorFunc();
    /*
    return await this.page.evaluate(() => {
      // @ts-ignore
      const teamSelector = window.getTeamSelectorComponent();
      if (!teamSelector) { return; }
      const selectedItem = teamSelector.selectedItem;
      return {
        id: selectedItem.id,
        name: teamSelector.value
      }
    });
    */
    return await this.page.evaluate(`(async () => {
  // @ts-ignore
  const teamSelector = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-team-selector').shadowRoot.querySelector('#team-switcher-button');
  if (!teamSelector) { return; }
  /* const selectedItem = teamSelector.selectedItem; */
  console.log('selected: ',teamSelector,'value: ',teamSelector.innerText);
  return {
    id: '', // teamSelector.contentElement.selected, /* selectedItem.id,*/
    name: teamSelector.innerText
  }
})()`) as { id: string, name: string };
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
    const teamName = getTeamName(options.team);
    params.append('team', `${options.team.teamId}|${encodeURIComponent(teamName)}`);
  }

  let finalRoute = routeParts[0];
  const paramsString = params.toString();
  if (paramsString.length > 0) {
    finalRoute += `?${paramsString}`;
  }
  return finalRoute;
}

function getTeamName(team: TeamOptions) {
  if (team.teamName) {
    return team.teamName;
  }

  switch (team.teamId) {
    case integrationTestData.TEAM1.ID:
      return integrationTestData.TEAM1.NAME;
    case integrationTestData.TEAM2.ID:
      return integrationTestData.TEAM2.NAME;
    default:
      return `Team ${team.teamId}`;
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

export function logWithTime(message: string, prefix?: string) {
  prefix = prefix || 'TEST LOG';
  console.log(`${prefix} [${currentTimeForLog()}]:`, message);
}

export function currentTimeForLog(): string {
  const options: any = {
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    fractionalSecondDigits: 3, hour12: false,
  };
  return new Intl.DateTimeFormat('default', options).format(Date.now());
}
