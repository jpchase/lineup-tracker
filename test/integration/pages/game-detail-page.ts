/** @format */

import { PageObject, PageOpenFunction, PageOptions } from './page-object.js';

export class GameDetailPage extends PageObject {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'viewGameDetail',
      route: `game/${options.gameId}`,
    });
  }

  protected override get openFunc(): PageOpenFunction | undefined {
    return async () => {
      await this.page.waitForTimeout(2000);
    };
  }
}
