import { PageObject, PageOptions } from './page-object.js';

export class GameDetailPage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'viewGameDetail',
      route: `game/${options.gameId}`
    });
  }

}
