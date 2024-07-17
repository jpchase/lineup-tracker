/** @format */

import { ContextProvider } from '@lit/context';
import '@material/mwc-button';
import '@material/mwc-icon';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { ConnectStoreMixin } from '../middleware/connect-mixin.js';
import { TimerData } from '../models/clock.js';
import { EventCollectionData } from '../models/events.js';
import {
  Formation,
  FormationBuilder,
  FormationType,
  formatPosition,
  getPositions,
  Position,
} from '../models/formation.js';
import { GameStatus } from '../models/game.js';
import { LiveGame, LivePlayer, PeriodStatus } from '../models/live.js';
import { PlayerTimeTrackerMapData } from '../models/shift.js';
import {
  cancelSub,
  cancelSwap,
  confirmSub,
  confirmSwap,
  discardPendingSubs,
  endPeriodCreator,
  eventSelected,
  eventUpdateRequested,
  gameCompleted,
  getLiveSliceConfigurator,
  markPeriodOverdueCreator,
  markPlayerOut,
  pendingSubsAppliedCreator,
  returnOutPlayer,
  selectEventsSelected,
  selectGameEvents,
  selectInvalidSubs,
  selectLiveGameById,
  selectPlayer,
  selectProposedSub,
  selectProposedSwap,
  startPeriodCreator,
  toggleClock,
} from '../slices/live/index.js';
import { RootState } from '../store.js';
import './lineup-game-clock.js';
import { ClockEndPeriodEvent, ClockPeriodData } from './lineup-game-clock.js';
import './lineup-game-events.js';
import { EventSelectedEvent, EventsUpdatedEvent } from './lineup-game-events.js';
import './lineup-game-shifts.js';
import './lineup-on-player-list.js';
import { PlayerSelectedEvent } from './lineup-player-card.js';
import './lineup-player-list.js';
import { LineupPlayerList } from './lineup-player-list.js';
import { playerResolverContext } from './player-resolver.js';
import { SharedStyles } from './shared-styles.js';
import { synchronizedTimerContext, SynchronizedTimerNotifier } from './synchronized-timer.js';
import { SynchronizedTriggerController } from './timer-controller.js';

// This element is connected to the Redux store.
@customElement('lineup-game-live')
export class LineupGameLive extends ConnectStoreMixin(LitElement) {
  override render() {
    return html` ${SharedStyles}
      <style>
        :host {
          display: block;
        }

        #sub-errors {
          color: red;
        }
      </style>
      <div>
        ${this._game
          ? html`
              ${this.renderGame(
                this.formation!,
                this._players!,
                this.trackerData!,
                this.eventData!,
                this.eventsSelectedIds
              )}
            `
          : html` <p class="empty-list">Live game not set.</p> `}
      </div>`;
  }

  private renderGame(
    formation: Formation,
    players: LivePlayer[],
    trackerData: PlayerTimeTrackerMapData,
    eventData: EventCollectionData,
    eventsSelectedIds: string[]
  ) {
    return html` <div toolbar>
        <lineup-game-clock
          id="gameTimer"
          .timerData="${this.clockData}"
          .periodData="${this.clockPeriodData}"
          @clock-start-period="${this.startClockPeriod}"
          @clock-end-period="${this.endClockPeriod}"
          @clock-toggled="${this.toggleClock}"
        >
        </lineup-game-clock>
        <mwc-button
          id="complete-button"
          icon="done_all"
          ?disabled="${!this.gamePeriodsComplete}"
          @click="${this.completeGame}"
          >Finish Game</mwc-button
        >
      </div>
      <div id="live-on">
        <h3>Playing</h3>
        <lineup-on-player-list
          .formation="${formation}"
          .players="${players}"
          .trackerData="${this.trackerData}"
          @position-selected="${this.playerSelected}"
        >
        </lineup-on-player-list>
      </div>
      <div id="live-next">
        <h3>Next On</h3>
        <div>
          <mwc-button id="sub-apply-btn" @click="${this._applySubs}">Sub</mwc-button>
          <mwc-button id="sub-discard-btn" @click="${this._discardSubs}">Discard</mwc-button>
          ${this.renderSubErrors()}
        </div>
        <lineup-player-list mode="next" .players="${players}" .trackerData="${trackerData}">
        </lineup-player-list>
      </div>
      <div id="confirm-sub">${this.renderConfirmSub()}</div>
      <div id="confirm-swap">${this.renderConfirmSwap()}</div>
      <div id="live-off">
        <h3>Subs</h3>
        <div>
          <mwc-button id="out-mark-btn" @click="${this.markUnavailable}">Out</mwc-button>
        </div>
        <lineup-player-list
          mode="off"
          .players="${players}"
          .trackerData="${this.trackerData}"
          @player-selected="${this.playerSelected}"
        >
        </lineup-player-list>
      </div>
      <div id="live-out">
        <h3>Unavailable</h3>
        <div>
          <mwc-button id="out-return-btn" @click="${this.markAvailable}">Return</mwc-button>
        </div>
        <lineup-player-list
          mode="out"
          .players="${players}"
          @player-selected="${this.playerSelected}"
        >
        </lineup-player-list>
      </div>
      <div id="live-totals">
        <h3>Playing Time</h3>
        <lineup-game-shifts .trackerData="${trackerData}" .players="${players}">
        </lineup-game-shifts>
      </div>
      <div id="events">
        <h3>History</h3>
        <lineup-game-events
          .eventData="${eventData}"
          .eventsSelectedIds="${eventsSelectedIds}"
          @event-selected="${this.toggleEventSelected}"
          @events-updated="${this.updateEvents}"
        >
        </lineup-game-events>
      </div>`;
  }

  private renderConfirmSub() {
    if (!this.proposedSub) {
      return nothing;
    }
    const sub = this.proposedSub;
    const replaced = this._findPlayer(sub.replaces!)!;
    const positionText = formatPosition(sub.currentPosition!);
    const allPositions = getPositions(this.formation!);

    return html`
      <div>
        <h3>Confirm sub?</h3>
        <span class="proposed-player">${sub.name} #${sub.uniformNumber}</span>
        <span class="proposed-position">${positionText}</span>
        <span class="replaced">${replaced.name}</span>
        <span class="override-position">
          <span>Position:</span>
          <select id="new-position-select" value="" title="Override target position for sub">
            <option value="">[Keep existing]</option>
            ${map(
              allPositions,
              (position) =>
                html`<option value="${position.id}">${formatPosition(position)}</option>`
            )}
          </select>
        </span>

        <mwc-button class="cancel" @click="${this.cancelSubClicked}">Cancel</mwc-button>
        <mwc-button class="ok" @click="${this.confirmSubClicked}">Confirm</mwc-button>
      </div>
    `;
  }

  private renderConfirmSwap() {
    if (!this.proposedSwap) {
      return nothing;
    }
    const swap = this.proposedSwap;
    const positionText = formatPosition(swap.nextPosition!);

    return html`
      <div>
        <h3>Confirm swap?</h3>
        <span class="proposed-player">${swap.name} #${swap.uniformNumber}</span>
        <span class="proposed-position">${positionText}</span>
        <mwc-button class="cancel" @click="${this.cancelSwapClicked}">Cancel</mwc-button>
        <mwc-button class="ok" @click="${this.confirmSwapClicked}">Confirm</mwc-button>
      </div>
    `;
  }

  private renderSubErrors() {
    if (!this.invalidSubs?.length) {
      return nothing;
    }
    const errorText = this.invalidSubs.join(', ');
    return html`
      <span id="sub-errors">
        <mwc-icon>report</mwc-icon>
        <span class="error">Invalid subs: ${errorText}</span>
      </span>
    `;
  }

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

  @state()
  private eventData?: EventCollectionData;

  @state()
  private eventsSelectedIds: string[] = [];

  @query('lineup-player-list[mode="next"]')
  private nextPlayerList!: LineupPlayerList;

  // Update player timers every 10 seconds.
  private timerTrigger = new SynchronizedTriggerController(this, 10000);
  private timerNotifier = new SynchronizedTimerNotifier();

  protected timerContext = new ContextProvider(this, {
    context: synchronizedTimerContext,
    initialValue: this.timerNotifier,
  });

  public requestTimerUpdate() {
    this.timerNotifier.notifyTimers();

    // While the period is running, check if overdue.
    if (this._game?.status === GameStatus.Live) {
      this.dispatch(markPeriodOverdueCreator(this._game.id));
    }
  }

  // Protected as a workaround for "not read" TS error.
  protected playerResolver = new ContextProvider(this, {
    context: playerResolverContext,
    initialValue: {
      getPlayer: (playerId) => {
        return this._findPlayer(playerId);
      },
    },
  });

  constructor() {
    super();
    this.registerSliceConfigurator(getLiveSliceConfigurator());
  }

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
      // TODO: This line causes multiple update warning
      this.clockPeriodData = {
        currentPeriod: clock.currentPeriod,
        periodLength: clock.periodLength,
        periodStatus: clock.periodStatus,
      };
      this.gamePeriodsComplete = clock.periodStatus === PeriodStatus.Done;
    } else {
      this.clockData = {};
      this.clockPeriodData = {} as ClockPeriodData;
      this.gamePeriodsComplete = false;
    }
    this.proposedSub = selectProposedSub(state);
    this.proposedSwap = selectProposedSwap(state);
    this.invalidSubs = selectInvalidSubs(state);
    const trackerMaps = state.live.shift?.trackerMaps;
    this.trackerData = trackerMaps ? trackerMaps[this._game.id] : undefined;
    this.eventData = selectGameEvents(state, this._game.id);
    this.eventsSelectedIds = selectEventsSelected(state) ?? [];
    this.timerTrigger.isRunning = !!this.trackerData?.clockRunning;
  }

  private playerSelected(e: PlayerSelectedEvent) {
    this.dispatch(selectPlayer(this._game!.id, e.detail.player!.id, e.detail.selected));
  }

  private getPositionSelect() {
    return this.shadowRoot!.querySelector('#new-position-select') as HTMLSelectElement;
  }

  private confirmSubClicked() {
    const select = this.getPositionSelect();
    let newPosition: Position | undefined;
    if (select.value) {
      const allPositions = getPositions(this.formation!);
      newPosition = allPositions.find((p) => p.id === select.value);
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
    const selectedOnly = this.nextPlayerList.hasSelected();
    this.dispatch(pendingSubsAppliedCreator(this._game!.id, selectedOnly));
  }

  private _discardSubs() {
    const selectedOnly = this.nextPlayerList.hasSelected();
    this.dispatch(discardPendingSubs(this._game!.id, selectedOnly));
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
    this.dispatch(startPeriodCreator(this._game!.id));
  }

  private endClockPeriod(e: ClockEndPeriodEvent) {
    this.dispatch(endPeriodCreator(this._game!.id, e.detail.extraMinutes));
  }

  private completeGame() {
    this.dispatch(gameCompleted(this._game!.id));
  }

  private toggleEventSelected(e: EventSelectedEvent) {
    this.dispatch(eventSelected(this._game!.id, e.detail.eventId, e.detail.selected));
  }

  private updateEvents(e: EventsUpdatedEvent) {
    this.dispatch(
      eventUpdateRequested(
        this._game!.id,
        e.detail.updatedEventIds,
        e.detail.useExistingTime,
        e.detail.existingEventId,
        e.detail.customTime
      )
    );
  }

  private _findPlayer(playerId: string) {
    return this._players!.find((player) => player.id === playerId);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-live': LineupGameLive;
  }
}
