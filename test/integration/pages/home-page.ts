/**
@license
*/

import { PageObject, PageOpenParams, PageOptions } from './page-object';

export class HomePage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      route: 'viewHome'
    });
  }
  protected get openParams(): PageOpenParams {
    return {
      route: 'viewHome'
    };
  }

}
