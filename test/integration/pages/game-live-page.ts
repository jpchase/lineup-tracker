import { TimerData } from '@app/models/clock.js';
import { LivePlayer } from '@app/models/live.js';
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

  async startGame() {
    throw new Error('Method not implemented.');
  }

  async substitutePlayer(_onPlayerId: string, _nextPlayerId: string) {
    throw new Error('Method not implemented.');
  }

  async getGameClock(): Promise<TimerData | undefined> {
    const liveHandle = await this.getLiveComponent();
    return await liveHandle.evaluate(async (liveNode) => {
      const gameClock = liveNode!.shadowRoot!.querySelector('lineup-game-clock');
      if (!gameClock) {
        return;
      }
      return gameClock.timerData;
    });
  }

  async getOnPlayers() {
    const liveHandle = await this.getLiveComponent();
    return await liveHandle.evaluate(async (liveNode) => {
      const onList = liveNode!.shadowRoot!.querySelector('lineup-on-player-list');
      if (!onList) {
        return [];
      }
      const items = onList.shadowRoot!.querySelectorAll('lineup-player-card');

      const players = [];
      for (const item of Array.from(items)) {
        const nameElement = item.querySelector('span.name');
        players.push({
          id: item.id,
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
}
