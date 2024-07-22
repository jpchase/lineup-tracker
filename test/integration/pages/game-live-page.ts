/** @format */

import { ClockPeriodData, LineupGameClock } from '@app/components/lineup-game-clock.js';
import { LineupGameEvents } from '@app/components/lineup-game-events.js';
import { LineupPlayerCard } from '@app/components/lineup-player-card.js';
import { TimerData } from '@app/models/clock.js';
import { LivePlayer, PeriodStartEvent } from '@app/models/live.js';
import { ElementHandle } from 'puppeteer';
import { Firestore, copyGame, createAdminApp, getFirestore } from '../server/firestore-access.js';
import { GameDetailPage } from './game-detail-page.js';
import { GameSetupPage } from './game-setup-page.js';
import { PageOpenFunction, PageOptions, pad0 } from './page-object.js';

// TODO: Reuse src definitions
export enum GameEventType {
  PeriodStart = 'PERIODSTART',
  PeriodEnd = 'PERIODEND',
  Setup = 'SETUP',
  SubIn = 'SUBIN',
  SubOut = 'SUBOUT',
  Swap = 'SWAP',
}

export class GameLivePage extends GameDetailPage {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'viewLiveGame',
      componentName: 'lineup-view-game-detail',
    });
  }

  protected override get openFunc(): PageOpenFunction | undefined {
    return async () => {
      await this.waitForTimeout(2000);
    };
  }

  static async createLivePage(options: PageOptions, existingFirestore?: Firestore) {
    // Create a new game, with roster, by copying the existing game.
    const firestore = existingFirestore ?? getFirestore(createAdminApp());
    const newGame = await copyGame(firestore, options.gameId!, options.userId!);

    // Sort the players by name, so there is a stable order across tests.
    const sortedPlayers = Object.values(newGame.roster).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const starters = sortedPlayers.slice(0, 11).map((player) => player.id);

    // Open the page *after* creating the game.
    // As the game is in "new" status, it starts on the setup view.
    const gameSetupPage = new GameSetupPage({
      ...options,
      gameId: newGame.id,
    });
    try {
      await gameSetupPage.init();
      await gameSetupPage.open({ signIn: true });

      // Complete all the setup to get the game into Start status.
      await gameSetupPage.completeSetup(starters);

      // With setup completed, the page should now be on the live view.
      const livePage = gameSetupPage.swap(GameLivePage, {
        ...options,
        gameId: newGame.id,
      });

      return { livePage, newGame, starters };
    } finally {
      gameSetupPage.close();
    }
  }

  async startGamePeriod() {
    const liveHandle = await this.getLiveComponent();
    const clockHandle = await this.getClockComponent(liveHandle);
    return clockHandle.evaluate(async (clock) => {
      const startButton = clock.shadowRoot!.querySelector('#start-button');
      if (!startButton) {
        this.log('Start button not found');
        return;
      }
      (startButton as HTMLElement).click();
    });
  }

  async substitutePlayer(onPlayerId: string, nextPlayerId: string) {
    // await this.page.evaluate(() => {
    //   debugger;
    // });
    const liveHandle = await this.getLiveComponent();
    await liveHandle.evaluate(
      async (liveNode, onId, nextId) => {
        const liveRoot = liveNode!.shadowRoot!;
        const onList = liveRoot.querySelector('lineup-on-player-list');
        const subsList = liveRoot.querySelector('#live-off lineup-player-list');
        if (!onList || !subsList) {
          throw new Error(`Lists not found`);
        }

        // Select the on player, |onPlayerId|, to be substituted.
        const onItems = Array.from<LineupPlayerCard>(
          onList.shadowRoot!.querySelectorAll('lineup-player-card'),
        );
        const onCard = onItems.find((card) => card.data?.player?.id === onId);
        if (!onCard) {
          throw new Error(`On player not found in list: ${onId}`);
        }
        onCard.click();

        // Select the off player, |nextPlayerId|, that will replace them.
        const subs = Array.from<LineupPlayerCard>(
          subsList.shadowRoot!.querySelectorAll('lineup-player-card'),
        );
        const subCard = subs.find((card) => card.player?.id === nextId);
        if (!subCard) {
          throw new Error(`Sub not found in list: ${nextId}`);
        }
        subCard.click();

        // Confirm the sub, after waiting a tick for updates to render.
        await Promise.resolve();
        const confirmSection = liveRoot.querySelector('#confirm-sub');
        if (!confirmSection) {
          throw new Error(`Missing confirm sub for: ${nextId}`);
        }
        const okButton = confirmSection.querySelector('mwc-button.ok');
        if (!okButton) {
          throw new Error(`Missing OK button for sub: ${nextId}`);
        }
        (okButton as HTMLElement).click();

        // Apply the sub, after waiting a tick for updates to render.
        await Promise.resolve();
        // const nextSection = liveRoot.querySelector('#live-next');
        // if (!nextSection) {
        //   throw new Error(`Missing next section for: ${onId}`);
        // }
        const applyButton = liveRoot.querySelector('#live-next #sub-apply-btn');
        if (!applyButton) {
          throw new Error(`Missing apply button for sub: ${onId}`);
        }
        (applyButton as HTMLElement).click();
      },
      onPlayerId,
      nextPlayerId,
    );
  }

  async getGameClock(): Promise<TimerData | undefined> {
    const clockHandle = await this.getClockComponent();
    return clockHandle.evaluate(async (clock) => {
      return clock.timerData;
    });
  }

  async getGamePeriod(): Promise<ClockPeriodData | undefined> {
    const clockHandle = await this.getClockComponent();
    return clockHandle.evaluate(async (clock) => {
      return clock.periodData;
    });
  }

  async editPeriodStart(newStartTime: number) {
    const eventsHandle = await this.getEventsComponent();

    // Select the event for period start.
    //  - Assumes there's only one period so far.
    await eventsHandle.evaluate(async (eventsNode, startEventType) => {
      const eventsRoot = eventsNode.shadowRoot!;

      const eventData = eventsNode.eventData;
      if (!eventData) {
        throw new Error('Event data is missing');
      }
      let startEvent: PeriodStartEvent | null = null;
      for (const gameEvent of eventData.events!) {
        if (gameEvent.type === startEventType) {
          startEvent = gameEvent as PeriodStartEvent;
          break;
        }
      }
      if (!startEvent) {
        throw new Error('Period start event is missing');
      }
      const startEventItem = eventsRoot.querySelector(
        `#events-list tr[data-event-id="${startEvent.id}"]`
      ) as HTMLElement;
      if (!startEventItem) {
        throw new Error(`Event item missing for id = {startEvent.id}`);
      }
      // Click the item for the start event to select, waiting a tick for updates to render.
      // eslint-disable-next-line no-console
      console.log(`Select the start event, by clicking`);
      startEventItem.click();
      await Promise.resolve();
    }, GameEventType.PeriodStart);

    // Edit the selected period start event.
    //  - In a separate evaluate() block to allow time for rendering updates
    //    to finish for event selection.
    const startTimeText = this.formatTimeFieldValue(new Date(newStartTime));
    await eventsHandle.evaluate(async (eventsNode, startTime) => {
      const eventsRoot = eventsNode.shadowRoot!;

      // Show the dialog, by clicking the edit button.
      // eslint-disable-next-line no-console
      console.log(`Click the edit button to show the dialog`);
      const editButton = eventsRoot.querySelector(
        '#events-header th #edit-selection-button'
      ) as HTMLElement;
      if (!editButton) {
        throw new Error('Edit button not found');
      }
      editButton.click();
      await Promise.resolve();

      // Enter the new time into the field in the dialog.
      // eslint-disable-next-line no-console
      console.log(`Enter the time in the edit dialog`);
      const editDialog = eventsRoot.querySelector('#edit-dialog');
      if (!editDialog) {
        throw new Error('Edit dialog not found');
      }
      const customTimeField = editDialog.querySelector(
        '#custom-time-field > input'
      ) as HTMLInputElement;
      if (!customTimeField) {
        throw new Error('Custom time field not found');
      }

      customTimeField.value = startTime;

      // Save the change to the event.
      // eslint-disable-next-line no-console
      console.log('Click the save button to apply the edit');
      const saveButton = editDialog.querySelector('mwc-button[dialogAction="save"]') as HTMLElement;
      if (!saveButton) {
        throw new Error('Save button not found');
      }
      saveButton.click();
      await Promise.resolve();
    }, startTimeText);
  }

  async getOnPlayers() {
    const liveHandle = await this.getLiveComponent();
    return liveHandle.evaluate(async (liveNode) => {
      const onList = liveNode!.shadowRoot!.querySelector('lineup-on-player-list');
      if (!onList) {
        return [];
      }
      const items = onList.shadowRoot!.querySelectorAll<LineupPlayerCard>('lineup-player-card');

      const players = [];
      for (const item of Array.from(items)) {
        const nameElement = item.shadowRoot!.querySelector('span.playerName');
        players.push({
          id: item.data?.player?.id,
          name: nameElement?.textContent,
        } as LivePlayer);
      }
      return players;
    });
  }

  async getLiveComponent() {
    const liveHandle = await this.querySelectorInView(this.componentName!, 'lineup-game-live');
    if (!liveHandle) {
      throw new Error('Live component not found');
    }
    return liveHandle;
  }

  private async getClockComponent(existingLiveHandle?: ElementHandle<Element>) {
    const liveHandle = existingLiveHandle ?? (await this.getLiveComponent());
    const clockHandle = await liveHandle.$('pierce/lineup-game-clock');
    if (!clockHandle) {
      throw new Error('Clock component not found');
    }
    return clockHandle as ElementHandle<LineupGameClock>;
  }

  private async getEventsComponent(existingLiveHandle?: ElementHandle<Element>) {
    const liveHandle = existingLiveHandle ?? (await this.getLiveComponent());
    const eventsHandle = await liveHandle.$('pierce/lineup-game-events');
    if (!eventsHandle) {
      throw new Error('Events component not found');
    }
    return eventsHandle as ElementHandle<LineupGameEvents>;
  }

  private formatTimeFieldValue(time: Date) {
    //  - The time field always uses UTC, and in 24 hour format.
    //  - The input to the field is adjusted by the UTC offset, so it displays local time.
    //  - e.g. A time of 2:00pm EST (7:00pm UTC) is adjusted to 2:00pm UTC, so the
    //    resulting value in the field is "14:00:00";
    const timeInputValue = `${pad0(time.getHours(), 2)}:${pad0(time.getMinutes(), 2)}:${pad0(
      time.getSeconds(),
      2
    )}`;
    return timeInputValue;
  }
}
