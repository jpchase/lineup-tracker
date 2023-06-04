/** @format */

import { Game } from '@app/models/game.js';
import { ElementHandle } from 'puppeteer';
import { PageObject, PageOpenFunction, PageOptions } from './page-object.js';

export class GameCreatePage extends PageObject {
  constructor(options: PageOptions = {}) {
    // TODO: Add component to wait on that?
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'addNewGame',
      route: 'viewGames',
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
      // Brief wait for dialog to render.
      await this.page.waitForTimeout(100);
    };
  }

  // TODO: Use same approach as setPeriods
  async fillGameDetails(game: Game, createHandle?: ElementHandle<Element>) {
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
    const dateString = `${localDate.getFullYear()}-${pad0(localDate.getMonth() + 1)}-${pad0(
      localDate.getDate()
    )}`;
    const timeString = localDate.toTimeString().substring(0, 5);

    console.log(
      `Game date: original = ${game.date}, emulated offset = ${emulatedOffset}, this offset = ${thisOffset}, local = ${localDate}, ${dateString}, ${timeString}`
    );
    if (!createHandle) {
      createHandle = await this.getCreateComponent();
    }

    await createHandle.evaluate(
      async (createNode, name, opponent, gameDate, gameTime) => {
        const createRoot = createNode!.shadowRoot!;

        const createDialog = createRoot.querySelector('#create-dialog');
        if (!createDialog) {
          throw new Error(`Create game dialog not found`);
        }

        const nameField = createRoot.querySelector(`#nameField > input`) as HTMLInputElement;
        nameField.value = name;

        const opponentField = createRoot.querySelector(
          `#opponentField > input`
        ) as HTMLInputElement;
        opponentField.value = opponent;

        const dateField = createRoot.querySelector(`#dateField > input`) as HTMLInputElement;
        dateField.value = gameDate;

        const timeField = createRoot.querySelector(`#timeField > input`) as HTMLInputElement;
        timeField.value = gameTime;
      },
      game.name,
      game.opponent,
      dateString,
      timeString
    );
  }

  async saveNewGame(createHandle?: ElementHandle<Element>) {
    if (!createHandle) {
      createHandle = await this.getCreateComponent();
    }

    await createHandle.evaluate(async (createNode) => {
      const createRoot = createNode!.shadowRoot!;

      const createDialog = createRoot.querySelector('#create-dialog');
      if (!createDialog) {
        throw new Error(`Create game dialog not found`);
      }

      const saveButton = createDialog.querySelector(
        'mwc-button[dialogAction="save"]'
      ) as HTMLButtonElement;
      //saveButton.scrollIntoView();
      saveButton.click();
    });

    this.log(`game create button clicked`);
    // TODO: Use wait for view ready, once the page is waiting for game to be created.
    // Could do similar to the "roster copying" on the game roster page?
    await this.page.waitForTimeout(3500);
    this.log(`wait for game create finished`);
  }

  async getGameId(game: Game) {
    const listHandle = await this.querySelectorInView('lineup-view-games', 'lineup-game-list');
    if (!listHandle) {
      throw new Error('List component not found');
    }

    return listHandle.evaluate(
      async (listNode, gameName: string, _opponent: string) => {
        const names = listNode.shadowRoot!.querySelectorAll('.list .game .name');

        for (const nameElement of Array.from(names)) {
          if (nameElement.textContent?.trim() !== gameName) {
            continue;
          }
          const listItem = nameElement.parentElement!;
          const link = listItem.querySelector('a[title="View game"]') as HTMLLinkElement;
          const parts = link.href.split('/');
          return parts[parts.length - 1];
        }
        return undefined;
      },
      game.name,
      game.opponent
    );
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
  return value.toString().padStart(count ?? 2, '0');
}
