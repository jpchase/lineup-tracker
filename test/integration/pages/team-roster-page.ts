/** @format */

import { integrationTestData } from '../data/integration-data-constants.js';
import { PageObject, PageOptions } from './page-object.js';

export class TeamRosterPage extends PageObject {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'viewRoster',
      route: 'viewRoster',
      team: { teamId: integrationTestData.TEAM1.ID },
    });
  }
}
