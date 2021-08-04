import { PageObject, PageOptions } from './page-object.js';

export class GameDetailPage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'viewGameDetail',
      route: 'game/test_game1?team=test_team1'
    });
  }

}
