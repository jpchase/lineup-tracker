/** @format */

import { PageObject, PageOpenFunction, PageOptions } from './page-object.js';

export interface HomePageOptions extends PageOptions {
  openDrawer?: boolean;
  emptyRoute?: boolean;
}

export class HomePage extends PageObject {
  private showDrawerOnOpen = false;

  constructor(options: HomePageOptions = {}) {
    super({
      ...options,
      route: options.route ?? (options.emptyRoute ? '' : HomePage.defaultRoute),
      scenarioName: options.scenarioName ?? (options.openDrawer ? 'navigation-drawer' : ''),
    });
    this.showDrawerOnOpen = !!options.openDrawer;
  }

  static get defaultRoute(): string {
    return 'viewHome';
  }

  override get openFunc(): PageOpenFunction | undefined {
    if (!this.showDrawerOnOpen) {
      return undefined;
    }
    return async () => {
      await this.waitForTimeout(500);
      await this.page.evaluate(`(async () => {
        console.log('click the menu button');
        const menuButton = document.querySelector('lineup-app').shadowRoot.
          querySelector('mwc-drawer mwc-top-app-bar > mwc-icon-button');
        await menuButton.click();
        console.log('drawer is open?');
      })()`);
    };
  }
}
