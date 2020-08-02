/**
@license
*/

import { PageObject, PageOpenParams, PageOptions } from './page-object';

export class TeamRosterPage extends PageObject {

  constructor(options: PageOptions = {}) {
    super(options);
  }
  protected get openParams(): PageOpenParams {
    return {
      route: 'viewRoster?team=test_team1'
    };
  }

}