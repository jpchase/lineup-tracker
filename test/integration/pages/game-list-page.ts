import { integrationTestData } from '../data/integration-data-constants.js';
import { PageObject, PageOptions } from './page-object.js';

export class GameListPage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'viewGames',
      route: 'viewGames',
      componentName: 'lineup-view-games',
      team: { teamId: integrationTestData.TEAM1.ID }
    });
  }

}
