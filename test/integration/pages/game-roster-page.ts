/** @format */

import { Firestore, copyGame, createAdminApp, getFirestore } from '../server/firestore-access.js';
import { PageOptions } from './page-object.js';
import { RosterPageObject } from './roster-page-object.js';

export class GameRosterPage extends RosterPageObject {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'viewGameRoster',
      route: `gameroster/${options.gameId}`,
      componentName: 'lineup-view-game-roster',
    });
  }

  static async createRosterPage(options: PageOptions, existingFirestore?: Firestore) {
    // Create a new game, with roster, by copying the existing game.
    const firestore = existingFirestore ?? getFirestore(createAdminApp());
    const game = await copyGame(firestore, options.gameId!, options.userId!);

    // Open the page *after* creating the game.
    const rosterPage = new GameRosterPage({
      ...options,
      gameId: game.id,
    });
    try {
      await rosterPage.init();
      await rosterPage.open({ signIn: true });
    } catch {
      rosterPage.close();
    }
    return { rosterPage, game };
  }

  async copyTeamRoster() {
    const buttonHandle = await this.querySelectorInView('lineup-view-game-roster', '#copy-button');
    if (!buttonHandle) {
      throw new Error('Copy roster button not found');
    }
    await buttonHandle.click();
    await this.waitForViewReady();
  }
}
