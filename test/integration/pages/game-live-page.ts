import { LineupGameClock } from '@app/components/lineup-game-clock.js';
import { LineupPlayerCard } from '@app/components/lineup-player-card.js';
import { TimerData } from '@app/models/clock.js';
import { LivePlayer } from '@app/models/live.js';
import { ElementHandle } from 'puppeteer';
import { GameDetailPage } from './game-detail-page.js';
import { PageOpenFunction, PageOptions } from './page-object.js';

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
      await this.page.waitForTimeout(2000);
    }
  }

  async startGamePeriod() {
    const liveHandle = await this.getLiveComponent();
    const clockHandle = await this.getClockComponent(liveHandle);
    return clockHandle.evaluate(async (clock) => {
      const startButton = clock.shadowRoot!.querySelector('#start-button');
      if (!startButton) {
        console.log('Start button not found');
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
    await liveHandle.evaluate(async (liveNode, onId, nextId) => {
      const liveRoot = liveNode!.shadowRoot!
      const onList = liveRoot.querySelector('lineup-on-player-list');
      const subsList = liveRoot.querySelector('#live-off lineup-player-list');
      if (!onList || !subsList) {
        throw new Error(`Lists not found`);
      }

      // Select the on player, |onPlayerId|, to be substituted.
      const onItems = Array.from<LineupPlayerCard>(onList.shadowRoot!.querySelectorAll('lineup-player-card'));
      const onCard = onItems.find(card => (card.data?.player?.id === onId));
      if (!onCard) {
        throw new Error(`On player not found in list: ${onId}`);
      }
      onCard.click();

      // Select the off player, |nextPlayerId|, that will replace them.
      const subs = Array.from<LineupPlayerCard>(subsList.shadowRoot!.querySelectorAll('lineup-player-card'));
      const subCard = subs.find(card => (card.player?.id === nextId));
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
    }, onPlayerId, nextPlayerId);
  }

  async getGameClock(): Promise<TimerData | undefined> {
    const clockHandle = await this.getClockComponent();
    return clockHandle.evaluate(async (clock) => {
      return clock.timerData;
    });
  }

  async getOnPlayers() {
    const liveHandle = await this.getLiveComponent();
    return await liveHandle.evaluate(async (liveNode) => {
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
          name: nameElement?.textContent
        } as LivePlayer)
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

  private async getClockComponent(liveHandle?: ElementHandle<Element>) {
    if (!liveHandle) {
      liveHandle = await this.getLiveComponent();
    }
    const clockHandle = await liveHandle.$('pierce/lineup-game-clock');
    if (!clockHandle) {
      throw new Error('Clock component not found');
    }
    return clockHandle as ElementHandle<LineupGameClock>;
  }
}
