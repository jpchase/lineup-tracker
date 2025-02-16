/** @format */

import { integrationTestData } from '../data/integration-data-constants.js';
import { Firestore, copyTeam, createAdminApp, getFirestore } from '../server/firestore-access.js';
import { PageOptions } from './page-object.js';
import { RosterPageObject } from './roster-page-object.js';

export class TeamRosterPage extends RosterPageObject {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'viewRoster',
      route: 'viewRoster',
      componentName: 'lineup-view-roster',
      team: options.team ?? { teamId: integrationTestData.TEAM1.ID },
    });
  }

  static async createRosterPage(options: PageOptions, existingFirestore?: Firestore) {
    // Create a new team, with roster, by copying the existing team.
    const firestore = existingFirestore ?? getFirestore(createAdminApp());
    const { team, roster } = await copyTeam(firestore, options.team?.teamId!, options.userId!);

    // Open the page *after* creating the team.
    const rosterPage = new TeamRosterPage({
      ...options,
      team: { teamId: team.id, teamName: team.name },
    });
    try {
      await rosterPage.init();
      await rosterPage.open({ signIn: true });
    } catch {
      rosterPage.close();
    }
    return { rosterPage, team, roster };
  }
}
