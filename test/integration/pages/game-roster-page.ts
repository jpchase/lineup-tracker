/**
@license
*/

import { ElementHandle } from 'puppeteer';
import { PageObject, PageOptions } from './page-object.js';

export class GameRosterPage extends PageObject {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'viewGameRoster',
      route: 'gameroster/test_game3?team=test_team1'
    });
  }

  async getPlayers() {
    return await this.page.evaluate(`(async () => {
  // @ts-ignore
  console.log('in getPlayers');
  const roster = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-game-roster').shadowRoot.querySelector('lineup-roster');
  if (!roster) {
    return [];
  }
  const items = roster.shadowRoot.querySelectorAll('mwc-list mwc-list-item');
  console.log('items count = ',items.length);
  return Array.from(items, (item) => {return {
      id: item.id,
      name: item.querySelector('.name').textContent,
      uniformNumber: Number.parseInt(item.querySelector('.avatar').textContent.slice(1))
    }}
  );
})()`) as Array<{ id: string, name: string, uniformNumber: number }>;
  }

  async showCreateWidget() {
    const buttonHandle = await this.page.evaluateHandle(`(async () => {
      const addPlayerButton = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-game-roster').shadowRoot.querySelector('lineup-roster').shadowRoot.querySelector('mwc-fab');
      return addPlayerButton;
    })()`) as ElementHandle;
    await buttonHandle.click();
    // await this.page.waitFor(500);
  }

  async fillPlayerFields(playerName: string, uniformNumber: number) {
    await this.page.evaluate(`(async (playerName, uniformNumber) => {
      const playerCreate = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-game-roster').shadowRoot.querySelector('lineup-roster').shadowRoot.querySelector('lineup-roster-modify');
      const nameField = playerCreate.shadowRoot.querySelector('#nameField');
      nameField.input.value = playerName;
      const uniformNumberField = playerCreate.shadowRoot.querySelector('#uniformNumberField');
      uniformNumberField.input.value = uniformNumber;
      console.log('done fill: ', nameField.value);
    })('${playerName}', '${uniformNumber}')`);
  }

  async saveNewPlayer() {
    const buttonHandle = await this.page.evaluateHandle(`(async () => {
      const playerCreate = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-game-roster').shadowRoot.querySelector('lineup-roster').shadowRoot.querySelector('lineup-roster-modify');
      const saveButton = playerCreate.shadowRoot.querySelector('mwc-button.save');
      return saveButton;
    })()`) as ElementHandle;
    await buttonHandle.click();
    // await this.page.waitFor(500);
  }
}
