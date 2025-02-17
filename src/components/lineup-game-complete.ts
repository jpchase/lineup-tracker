/** @format */

import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { RootState } from '../app/store.js';
import { LiveGame, LivePlayer } from '../models/live.js';
import { PlayerTimeTrackerMapData } from '../models/shift.js';
import { getLiveSliceConfigurator, selectLiveGameById } from '../slices/live/index.js';
import { ConnectStoreMixin } from './core/connect-mixin.js';
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

  @property({ type: String })
  gameId?: string;

  @state()
  private game?: LiveGame;

  @state()
  private players?: LivePlayer[];

  @state()
  private trackerData?: PlayerTimeTrackerMapData;

  constructor() {
    super();
    this.registerSliceConfigurator(getLiveSliceConfigurator());
  }

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
