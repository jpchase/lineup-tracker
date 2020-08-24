/**
@license
*/

import { PageObject, PageOptions } from './page-object';

export class HomePage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      route: HomePage.defaultRoute
    });
  }

  static get defaultRoute(): string {
    return 'viewHome';
  }

}
