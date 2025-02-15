/** @format */

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

  async copyTeamRoster() {
    const buttonHandle = await this.querySelectorInView('lineup-view-game-roster', '#copy-button');
    if (!buttonHandle) {
      throw new Error('Copy roster button not found');
    }
    await buttonHandle.click();
    await this.waitForViewReady();
  }
}
