/**
@license
*/

import { PageObject, PageOptions } from './page-object';

export class TeamRosterPage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'viewRoster',
      route: 'viewRoster?team=test_team1'
    });
  }

}
