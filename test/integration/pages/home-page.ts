/**
@license
*/

import { PageObject, PageOpenFunction, PageOptions } from './page-object';

export class HomePage extends PageObject {
  private showDrawerOnOpen = false;

  constructor(options: PageOptions = {}, openDrawer = false) {
    super({
      ...options,
      route: HomePage.defaultRoute,
      scenarioName: options.scenarioName ?? (openDrawer ? 'navigation-drawer' : '')
    });
    this.showDrawerOnOpen = openDrawer;
  }

  static get defaultRoute(): string {
    return 'viewHome';
  }

  protected get openFunc(): PageOpenFunction | undefined {
    if (!this.showDrawerOnOpen) {
      return;
    }
    return async () => {
      await this.page.waitFor(500);
      await this.page.evaluate(`(async () => {
        console.log('click the menu button');
        const menuButton = document.querySelector('lineup-app').shadowRoot.
          querySelector('app-header app-toolbar .menu-btn');
        await menuButton.click();
        console.log('drawer is open?');
      })()`);
    };
  }
}
