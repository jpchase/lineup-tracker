import { Game } from '@app/models/game.js';
import { ElementHandle } from 'puppeteer';
import { PageObject, PageOpenFunction, PageOptions } from './page-object.js';

export class GameCreatePage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'addNewGame',
      route: 'viewGames'
    });
  }

  override get openFunc(): PageOpenFunction | undefined {
    return async () => {
      await this.page.waitForTimeout(500);
      const buttonHandle = await this.querySelectorInView('lineup-view-games', 'mwc-fab');
      if (!buttonHandle) {
        throw new Error('New game button not found');
      }
      await buttonHandle.click();
    };
  }

  async fillGameDetails(game: Game) {
    // The game create fields expect the date/time in the local timezone,
    // as emulated by Puppeteer. The timezone is set to 'America/New_York' to
    // have a consistent value for screenshots, regardless of the machine that
    // is running the tests.
    // Formatting |game.date| into strings basically throws away the timezone,
    // rather than converting to local time.
    // Manually convert the date to local time, so that the resulting date,
    // which is stored as UTC, matches the intended value.
    // Need to calculate the offset between the emulated timezone, and the
    // timezone of this machine.
    const emulatedOffset = await this.getTimezoneOffset();
    const thisOffset = game.date.getTimezoneOffset();
    const localDate = new Date(game.date);
    localDate.setUTCMinutes(localDate.getUTCMinutes() - emulatedOffset + thisOffset);
    const dateString = `${localDate.getFullYear()}-${pad0(localDate.getMonth() + 1)}-${pad0(localDate.getDate())}`;
    const timeString = localDate.toTimeString().substring(0, 5);

    console.log(`Game date: original = ${game.date}, emulated offset = ${emulatedOffset}, this offset = ${thisOffset}, local = ${localDate}, ${dateString}, ${timeString}`);
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
    this.log(`game create button clicked`);
    await this.page.waitForTimeout(3500);
    this.log(`wait for team create finished`);
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

  async getCreateComponent() {
    const createHandle = await this.querySelectorInView('lineup-view-games', 'lineup-game-create');
    if (!createHandle) {
      throw new Error('Create component not found');
    }
    return createHandle;
  }
}

function pad0(value: number, count?: number): string {
  count = count ?? 2;
  let result = value.toString();
  for (; result.length < count; --count) {
    result = '0' + result;
  }
  return result;
}
