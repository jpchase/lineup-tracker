import { Player } from '@app/models/player.js';
import { ElementHandle } from 'puppeteer';
import { PageObject, PageOptions } from './page-object.js';

export class GameRosterPage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'addNewGame',
      route: `gameroster/${options.gameId}?team=${options.teamId}`
    });
  }

  async getPlayers() {
    return await this.page.evaluate(async () => {
      const app = document.querySelector('lineup-app');
      const view = app!.shadowRoot!.querySelector('lineup-view-game-roster');
      const roster = view!.shadowRoot!.querySelector('lineup-roster');
      if (!roster) {
        return [];
      }
      const items = roster.shadowRoot!.querySelectorAll('mwc-list mwc-list-item');

      const players = [];
      for (const item of Array.from(items)) {
        const nameElement = item.querySelector('span.name');
        players.push({
          id: item.id,
          name: nameElement?.textContent
        } as Player)
      }
      return players;
    });
  }

  async copyTeamRoster() {
    const buttonHandle = await this.page.evaluateHandle((async () => {
      const app = document.querySelector('lineup-app');
      const view = app!.shadowRoot!.querySelector('lineup-view-game-roster');
      const copyButton = view!.shadowRoot!.querySelector('mwc-button');
      return copyButton;
    })) as ElementHandle;
    await buttonHandle.click();
    await this.page.waitForTimeout(3000);
  }
}
