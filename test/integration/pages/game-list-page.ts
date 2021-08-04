import { PageObject, PageOptions } from './page-object.js';

export class GameListPage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'viewGames',
      route: 'viewGames?team=test_team1'
    });
  }

}
