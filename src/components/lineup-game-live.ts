import { ContextProvider } from '@lit-labs/context';
import '@material/mwc-button';
import '@material/mwc-icon';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { ConnectStoreMixin } from '../middleware/connect-mixin.js';
import { TimerData } from '../models/clock.js';
import { Formation, FormationBuilder, FormationType, formatPosition, getPositions, Position } from '../models/formation.js';
import { LiveGame, LivePlayer, PeriodStatus } from '../models/live.js';
import { PlayerTimeTrackerMapData } from '../models/shift.js';
// The specific store configurator, which handles initialization/lazy-loading.
import { getLiveStore } from '../slices/live-store.js';
import {
  cancelSub, cancelSwap, confirmSub, confirmSwap, discardPendingSubs, endPeriod,
  gameCompleted,
  markPlayerOut,
  pendingSubsAppliedCreator,
  proposedSubSelector, returnOutPlayer, selectLiveGameById, selectInvalidSubs, selectPlayer, selectProposedSwap, startGamePeriod, toggleClock
} from '../slices/live/live-slice.js';
import { RootState, RootStore, SliceStoreConfigurator } from '../store.js';
import './lineup-game-clock.js';
import { ClockPeriodData } from './lineup-game-clock.js';
import './lineup-game-shifts.js';
import './lineup-on-player-list.js';
import './lineup-player-list.js';
import { playerResolverContext } from './player-resolver.js';
import { SharedStyles } from './shared-styles.js';
import { synchronizedTimerContext, SynchronizedTimerNotifier } from './synchronized-timer.js';
import { SynchronizedTriggerController } from './timer-controller.js';

// This element is connected to the Redux store.
@customElement('lineup-game-live')
export class LineupGameLive extends ConnectStoreMixin(LitElement) {
  override render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }

        #sub-errors {
          color: red;
        }
      </style>
      <div>
      ${this._game ? html`
        ${this.renderGame(this.formation!, this._players!, this.trackerData!)}
      ` : html`
        <p class="empty-list">
          Live game not set.
        </p>
      `}
      </div>`
  }

  private renderGame(formation: Formation, players: LivePlayer[], trackerData: PlayerTimeTrackerMapData) {
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
          ${this.getSubErrors()}
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
        <div>
          <mwc-button id="out-mark-btn" @click="${this.markUnavailable}">Out</mwc-button>
        </div>
        <lineup-player-list mode="off" .players="${players}"
                            .trackerData="${this.trackerData}"
                            @playerselected="${this._playerSelected}"></lineup-player-list>
      </div>
      <div id="live-out">
        <h5>Unavailable</h5>
        <div>
          <mwc-button id="out-return-btn" @click="${this.markAvailable}">Return</mwc-button>
        </div>
        <lineup-player-list mode="out" .players="${players}"
                            @playerselected="${this._playerSelected}"></lineup-player-list>
      </div>
      <div id="live-totals">
        <h5>Playing Time</h5>
        <lineup-game-shifts .trackerData="${trackerData}" .players="${players}"></lineup-game-shifts>
      </div>`
  }

  private getConfirmSub() {
    if (!this.proposedSub) {
      return nothing;
    }
    const sub = this.proposedSub;
    const replaced = this._findPlayer(sub.replaces!)!;
    let positionText = formatPosition(sub.currentPosition!);
    const allPositions = getPositions(this.formation!);

    return html`
      <div>
        <h5>Confirm sub?</h5>
        <span class="proposed-player">${sub.name} #${sub.uniformNumber}</span>
        <span class="proposed-position">${positionText}</span>
        <span class="replaced">${replaced.name}</span>
        <span class="override-position">
          <span>Position:</span>
          <select id="new-position-select" value="">
              <option value="">[Keep existing]</option>
              ${map(allPositions, (position) =>
      html`<option value="${position.id}">
              ${formatPosition(position)}</option>`)}
          </select>
        </span>

        <mwc-button class="cancel" @click="${this.cancelSubClicked}">Cancel</mwc-button>
        <mwc-button class="ok" autofocus @click="${this.confirmSubClicked}">Confirm</mwc-button>
      </div>
    `;
  }

  private getConfirmSwap() {
    if (!this.proposedSwap) {
      return nothing;
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

  private getSubErrors() {
    if (!this.invalidSubs?.length) {
      return nothing;
    }
    let errorText = this.invalidSubs.join(', ');
    return html`
      <span id="sub-errors">
        <mwc-icon>report</mwc-icon>
        <span class="error">Invalid subs: ${errorText}</span>
      </span>
    `;
  }

  @property({ type: Object })
  override store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getLiveStore;

  @property({ type: String })
  gameId?: string;

  @state()
  private _game: LiveGame | undefined;

  @state()
  private _players: LivePlayer[] | undefined;

  @state()
  private formationType?: FormationType;

  @state()
  private formation?: Formation;

  @state()
  private proposedSub?: LivePlayer;

  @state()
  private proposedSwap?: LivePlayer;

  @state()
  private invalidSubs?: string[];

  @state()
  private clockData?: TimerData;

  @state()
  private clockPeriodData?: ClockPeriodData;

  @state()
  private gamePeriodsComplete = false;

  @state()
  private trackerData?: PlayerTimeTrackerMapData;

  // Update player timers every 10 seconds.
  private timerTrigger = new SynchronizedTriggerController(this, 10000);
  private timerNotifier = new SynchronizedTimerNotifier();

  protected timerContext = new ContextProvider(this,
    synchronizedTimerContext,
    this.timerNotifier);

  public requestTimerUpdate() {
    this.timerNotifier.notifyTimers();
  }

  // Protected as a workaround for "not read" TS error.
  protected playerResolver = new ContextProvider(this, playerResolverContext, {
    getPlayer: (playerId) => {
      return this._findPlayer(playerId);
    }
  });

  override stateChanged(state: RootState) {
    if (!state.live || !this.gameId) {
      return;
    }
    this._game = selectLiveGameById(state, this.gameId);
    if (!this._game) {
      return;
    }

    this._players = this._game.players || [];
    if (this.formation && this.formation.type === this._game.formation?.type) {
      // Formation type is unchanged, nothing to do.
    } else {
      this.formationType = this._game.formation?.type;
      if (this.formationType) {
        this.formation = FormationBuilder.create(this.formationType);
      } else {
        this.formation = undefined;
      }
    }
    const clock = this._game.clock;
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
    this.invalidSubs = selectInvalidSubs(state);
    const trackerMaps = state.live.shift?.trackerMaps;
    this.trackerData = trackerMaps ? trackerMaps[this._game.id] : undefined;
    this.timerTrigger.isRunning = !!this.trackerData?.clockRunning;
  }

  private _playerSelected(e: CustomEvent) {
    this.dispatch(selectPlayer(this._game!.id, e.detail.player.id, e.detail.selected));
  }

  private getPositionSelect() {
    return this.shadowRoot!.querySelector('#new-position-select') as HTMLSelectElement;
  }

  private confirmSubClicked() {
    const select = this.getPositionSelect();
    let newPosition: Position | undefined = undefined;
    if (select.value) {
      const allPositions = getPositions(this.formation!);
      newPosition = allPositions.find(p => (p.id === select.value));
    }
    this.dispatch(confirmSub(this._game!.id, newPosition));
  }

  private cancelSubClicked() {
    this.dispatch(cancelSub(this._game!.id));
  }

  private confirmSwapClicked() {
    this.dispatch(confirmSwap(this._game!.id));
  }

  private cancelSwapClicked() {
    this.dispatch(cancelSwap(this._game!.id));
  }

  private _applySubs() {
    // TODO: Pass selectedOnly param, based on if any next cards are selected
    this.dispatch(pendingSubsAppliedCreator(this._game!.id));
  }

  private _discardSubs() {
    // TODO: Pass selectedOnly param, based on if any next cards are selected
    this.dispatch(discardPendingSubs(this._game!.id));
  }

  private markUnavailable() {
    this.dispatch(markPlayerOut(this._game!.id));
  }

  private markAvailable() {
    this.dispatch(returnOutPlayer(this._game!.id));
  }

  private toggleClock() {
    this.dispatch(toggleClock(this._game!.id));
  }

  private startClockPeriod() {
    this.dispatch(startGamePeriod(this._game!.id));
  }

  private endClockPeriod() {
    this.dispatch(endPeriod(this._game!.id));
  }

  private completeGame() {
    this.dispatch(gameCompleted(this._game!.id));
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
