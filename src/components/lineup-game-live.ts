/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-icon';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { connectStore } from '../middleware/connect-mixin.js';
import { TimerData } from '../models/clock.js';
import { FormationBuilder, formatPosition } from '../models/formation.js';
import { LiveGame, LivePlayer } from '../models/game.js';
import { PeriodStatus } from '../models/live.js';
import { PlayerTimeTrackerMapData } from '../models/shift.js';
// The specific store configurator, which handles initialization/lazy-loading.
import { getLiveStore } from '../slices/live-store.js';
import {
  cancelSub, cancelSwap, clockSelector, confirmSub, confirmSwap, discardPendingSubs, endPeriod,
  gameCompleted,
  pendingSubsAppliedCreator,
  proposedSubSelector, selectPlayer, selectProposedSwap, startGamePeriod, toggleClock
} from '../slices/live/live-slice.js';
import { RootState, RootStore, SliceStoreConfigurator } from '../store.js';
import './lineup-game-clock.js';
import { ClockPeriodData } from './lineup-game-clock.js';
import './lineup-game-shifts.js';
import './lineup-on-player-list.js';
import './lineup-player-list.js';
import { SharedStyles } from './shared-styles.js';

// This element is connected to the Redux store.
@customElement('lineup-game-live')
export class LineupGameLive extends connectStore()(LitElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
      ${this._game ? html`
        ${this.renderGame(this._game, this._players!, this.trackerData!)}
      ` : html`
        <p class="empty-list">
          Live game not set.
        </p>
      `}
      </div>`
  }

  private renderGame(game: LiveGame, players: LivePlayer[], trackerData: PlayerTimeTrackerMapData) {
    // TODO: Turn this into a property, rather than creating new each time?
    // Is it causing unnecessary updates?
    let formation = undefined;
    if (game.formation) {
      formation = FormationBuilder.create(game.formation.type);
    }

    return html`
      <div toolbar>
        <lineup-game-clock id="gameTimer" .timerData="${this.clockData}"
                           .periodData="${this.clockPeriodData}"
                           @clock-start-period="${this.startClockPeriod}"
                           @clock-end-period="${this.endClockPeriod}"
                           @clock-toggled="${this.toggleClock}"></lineup-game-clock>
        <mwc-button id="complete-button"
                    icon="done_all"
                    ?disabled="${!this.gamePeriodsComplete}"
                    @click="${this.completeGame}">Finish Game</mwc-button>
      </div>
      <div id="live-on">
        <h5>Playing</h5>
        <lineup-on-player-list .formation="${formation}" .players="${players}"
                               .trackerData="${this.trackerData}"
                               @positionselected="${this._playerSelected}"></lineup-on-player-list>
      </div>
      <div id="live-next">
        <h5>Next On</h5>
        <div>
          <mwc-button id="sub-apply-btn" @click="${this._applySubs}">Sub</mwc-button>
          <mwc-button id="sub-discard-btn" @click="${this._discardSubs}">Discard</mwc-button>
        </div>
        <lineup-player-list mode="next" .players="${players}" .trackerData="${trackerData}" >
        </lineup-player-list>
      </div>
      <div id="confirm-sub">
      ${this.getConfirmSub()}
      </div>
      <div id="confirm-swap">
      ${this.getConfirmSwap()}
      </div>
      <div id="live-off">
        <h5>Subs</h5>
        <lineup-player-list mode="off" .players="${players}"
                            .trackerData="${this.trackerData}"
                            @playerselected="${this._playerSelected}"></lineup-player-list>
      </div>
      <div id="live-out">
        <h5>Unavailable</h5>
        <lineup-player-list mode="out" .players="${players}"></lineup-player-list>
      </div>
      <div id="live-totals">
        <h5>Playing Time</h5>
        <lineup-game-shifts .trackerData="${trackerData}" .players="${players}"></lineup-game-shifts>
      </div>`
  }

  private getConfirmSub() {
    if (!this.proposedSub) {
      return '';
    }
    const sub = this.proposedSub;
    const replaced = this._findPlayer(sub.replaces!)!;
    let positionText = formatPosition(sub.currentPosition!);

    return html`
      <div>
        <h5>Confirm sub?</h5>
        <span class="proposed-player">${sub.name} #${sub.uniformNumber}</span>
        <span class="proposed-position">${positionText}</span>
        <span class="replaced">${replaced.name}</span>
        <mwc-button class="cancel" @click="${this.cancelSubClicked}">Cancel</mwc-button>
        <mwc-button class="ok" autofocus @click="${this.confirmSubClicked}">Confirm</mwc-button>
      </div>
    `;
  }

  private getConfirmSwap() {
    if (!this.proposedSwap) {
      return '';
    }
    const swap = this.proposedSwap;
    let positionText = formatPosition(swap.nextPosition!);

    return html`
      <div>
        <h5>Confirm swap?</h5>
        <span class="proposed-player">${swap.name} #${swap.uniformNumber}</span>
        <span class="proposed-position">${positionText}</span>
        <mwc-button class="cancel" @click="${this.cancelSwapClicked}">Cancel</mwc-button>
        <mwc-button class="ok" autofocus @click="${this.confirmSwapClicked}">Confirm</mwc-button>
      </div>
    `;
  }

  @property({ type: Object })
  store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getLiveStore;

  @property({ type: Object })
  private _game: LiveGame | undefined;

  @property({ type: Array })
  private _players: LivePlayer[] | undefined;

  @state()
  private proposedSub?: LivePlayer;

  @state()
  private proposedSwap?: LivePlayer;

  @state()
  private clockData?: TimerData;

  @state()
  private clockPeriodData?: ClockPeriodData;

  @state()
  private gamePeriodsComplete = false;

  @state()
  private trackerData?: PlayerTimeTrackerMapData;

  stateChanged(state: RootState) {
    if (!state.live) {
      return;
    }
    this._game = state.live!.liveGame;
    if (!this._game) {
      return;
    }

    this._players = this._game.players || [];
    const clock = clockSelector(state);
    if (clock) {
      this.clockData = clock.timer;
      this.clockPeriodData = {
        currentPeriod: clock.currentPeriod,
        periodStatus: clock.periodStatus
      };
      this.gamePeriodsComplete = clock.periodStatus == PeriodStatus.Done;
    } else {
      this.clockData = {};
      this.clockPeriodData = {} as ClockPeriodData;
      this.gamePeriodsComplete = false;
    }
    this.proposedSub = proposedSubSelector(state);
    this.proposedSwap = selectProposedSwap(state);
    this.trackerData = state.live.shift?.trackerMap;
  }

  private _playerSelected(e: CustomEvent) {
    this.dispatch(selectPlayer(e.detail.player.id, e.detail.selected));
  }

  private confirmSubClicked() {
    this.dispatch(confirmSub());
  }

  private cancelSubClicked() {
    this.dispatch(cancelSub());
  }

  private confirmSwapClicked() {
    this.dispatch(confirmSwap());
  }

  private cancelSwapClicked() {
    this.dispatch(cancelSwap());
  }

  private _applySubs() {
    // TODO: Pass selectedOnly param, based on if any next cards are selected
    this.dispatch(pendingSubsAppliedCreator());
  }

  private _discardSubs() {
    // TODO: Pass selectedOnly param, based on if any next cards are selected
    this.dispatch(discardPendingSubs());
  }

  private toggleClock() {
    this.dispatch(toggleClock());
  }

  private startClockPeriod() {
    this.dispatch(startGamePeriod());
  }

  private endClockPeriod() {
    this.dispatch(endPeriod());
  }

  private completeGame() {
    this.dispatch(gameCompleted(this._game?.id!));
  }

  private _findPlayer(playerId: string) {
    return this._players!.find(player => (player.id === playerId));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-live': LineupGameLive;
  }
}
