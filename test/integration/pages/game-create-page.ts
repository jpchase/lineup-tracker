import { Game } from '@app/models/game.js';
import { customQueryHandlerNames, ElementHandle } from 'puppeteer';
import { PageObject, PageOpenFunction, PageOptions } from './page-object.js';

export class GameCreatePage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'addNewGame',
      route: `viewGames?team=${options.teamId}`
    });
  }

  override get openFunc(): PageOpenFunction | undefined {
    return async () => {
      await this.page.waitForTimeout(500);
      await this.page.evaluate(`(async () => {
        const newGameButton = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-games').shadowRoot.querySelector('mwc-fab');
        await newGameButton.click();
      })()`);
    };
  }

  async fillGameDetails(game: Game) {
    const dateString = game.date.toISOString().substring(0, 10);
    const timeString = game.date.toTimeString().substring(0, 5);
    console.log('custom query handlers: ', customQueryHandlerNames());
    await this.page.evaluate(`(async (name, opponent, gameDate, gameTime) => {
      console.log('in the evaluate: ' + name);
      const gameCreate = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-games').shadowRoot.querySelector('lineup-game-create');
      const nameField = gameCreate.shadowRoot.querySelector('#nameField > input');
      nameField.value = name;
      const opponentField = gameCreate.shadowRoot.querySelector('#opponentField > input');
      opponentField.value = opponent;
      const dateField = gameCreate.shadowRoot.querySelector('#dateField > input');
      dateField.value = gameDate;
      const timeField = gameCreate.shadowRoot.querySelector('#timeField > input');
      timeField.value = gameTime;
      console.log('done the evaluate: [' + nameField.value + ']');
    })('${game.name}', '${game.opponent}', '${dateString}', '${timeString}')`);
  }

  async saveNewGame() {
    const buttonHandle = await this.page.evaluateHandle(`(async () => {
      console.log('get game create')
      const gameCreate = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-games').shadowRoot.querySelector('lineup-game-create');
      console.log('get save button')
      const saveButton = gameCreate.shadowRoot.querySelector('mwc-button.save');
      console.log('save button =', saveButton)
      saveButton.scrollIntoView();
      return saveButton;
    })()`) as ElementHandle;
    await buttonHandle.click();
    await this.page.waitForTimeout(3000);
  }

  async getGameId(game: Game) {
    return await this.page.evaluate((gameName: string, _opponent: string) => {
      const app = document.querySelector('lineup-app');
      const view = app!.shadowRoot!.querySelector('lineup-view-games');
      const list = view!.shadowRoot!.querySelector('lineup-game-list');
      const names = list!.shadowRoot!.querySelectorAll('.list .game .name');

      for (const nameElement of Array.from(names)) {
        if (nameElement.textContent?.trim() != gameName) {
          continue;
        }
        const listItem = nameElement.parentElement!;
        const link = listItem.querySelector('a[title="View game"]') as HTMLLinkElement;
        const parts = link.href.split('/');
        return parts[parts.length - 1];
      }
      return undefined;
    }, game.name, game.opponent);
  }
}
