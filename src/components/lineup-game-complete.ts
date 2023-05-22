/** @format */

import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ConnectStoreMixin } from '../middleware/connect-mixin.js';
import { LiveGame, LivePlayer } from '../models/live.js';
import { PlayerTimeTrackerMapData } from '../models/shift.js';
// The specific store configurator, which handles initialization/lazy-loading.
import { getLiveStore } from '../slices/live-store.js';
import { selectLiveGameById } from '../slices/live/live-slice.js';
import { RootState, RootStore, SliceStoreConfigurator } from '../store.js';
import './lineup-game-shifts.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-game-complete')
export class LineupGameComplete extends ConnectStoreMixin(LitElement) {
  override render() {
    return html` ${SharedStyles}
      <style>
        :host {
          display: block;
        }
      </style>
      <div>
        ${this.game
          ? html` ${this.renderGame(this.players!, this.trackerData!)} `
          : html` <p class="empty-list">Live game not set.</p> `}
      </div>`;
  }

  private renderGame(players: LivePlayer[], trackerData: PlayerTimeTrackerMapData) {
    return html` <div id="live-totals">
      <h5>Playing Time</h5>
      <lineup-game-shifts .trackerData="${trackerData}" .players="${players}"></lineup-game-shifts>
    </div>`;
  }

  @property({ type: Object })
  override store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getLiveStore;

  @property({ type: String })
  gameId?: string;

  @state()
  private game?: LiveGame;

  @state()
  private players?: LivePlayer[];

  @state()
  private trackerData?: PlayerTimeTrackerMapData;

  override stateChanged(state: RootState) {
    if (!state.live || !this.gameId) {
      return;
    }
    this.game = selectLiveGameById(state, this.gameId);
    if (!this.game) {
      return;
    }

    this.players = this.game.players || [];
    const trackerMaps = state.live.shift?.trackerMaps;
    this.trackerData = trackerMaps ? trackerMaps[this.game.id] : undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-complete': LineupGameComplete;
  }
}
