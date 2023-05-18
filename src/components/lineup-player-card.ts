/** @format */

import { ContextConsumer, contextProvided } from '@lit-labs/context';
import '@material/mwc-icon';
import { LitElement, PropertyValues, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Position, formatPosition } from '../models/formation.js';
import { LivePlayer } from '../models/live.js';
import { PlayerTimeTracker } from '../models/shift.js';
import { EVENT_PLAYERSELECTED, EVENT_POSITIONSELECTED } from './events.js';
import { PlayerResolver, playerResolverContext } from './player-resolver.js';
import { SharedStyles } from './shared-styles.js';
import { synchronizedTimerContext } from './synchronized-timer.js';
import { SynchronizedTimerController } from './timer-controller.js';

export interface PlayerCardData {
  id: string;
  position: Position;
  player?: LivePlayer;
}

// This element is *not* connected to the Redux store.
@customElement('lineup-player-card')
export class LineupPlayerCard extends LitElement {
  override render() {
    if (!this.data && !this.player) {
      return nothing;
    }
    let displayPosition: Position | undefined;
    let player: LivePlayer | undefined;

    if (this.data) {
      displayPosition = this.data.position;
      player = this.data.player;
    } else {
      player = this.player!;
    }
    if (player && player.currentPosition) {
      displayPosition = player.currentPosition;
    }
    if (player?.isSwap) {
      displayPosition = player.nextPosition;
    }
    const currentPosition = displayPosition ? formatPosition(displayPosition) : '';
    const positions = player?.positions || [];
    let subFor = '';
    if (player?.replaces) {
      const replacedPlayer = this.playerResolver?.getPlayer(player.replaces);
      if (replacedPlayer) {
        subFor = '-> ' + replacedPlayer.name;
      }
    }

    let currentIcon = '';
    // TODO: constants or enum for mode?
    if (this.mode === 'next') {
      currentIcon = player?.isSwap ? 'move_up' : 'swap_horiz';
    }

    const classes = { [this.mode.toLowerCase()]: true, swap: !!player?.isSwap };
    return html`
      ${SharedStyles}
      <style>
        .player.on,
        .player.off,
        .player.out {
          border: 1px;
          border-style: dashed;
          display: inline-block;
          min-height: 45px;
          text-align: center;
          width: 100px;
        }

        .player.next {
          /* display: inline-block; */
        }

        .player[selected] {
          border: 2px;
          border-style: solid;
        }

        /* Hide the icon, by default, as it's only used in one mode */
        #icon {
          display: none;
        }
        .player.next #icon {
          display: inline;
        }

        .shiftTime {
          display: block;
          font-style: italic;
          /* TODO: Load the outlined font */
          /* --mdc-icon-font: 'Material Icons Outlined'; */
        }

        .shiftTime mwc-icon {
          color: var(--mdc-theme-primary);
        }

        /* Hide fields based on mode */
        .player.on .playerPositions,
        .player.on .subFor,
        .player.next .playerPositions,
        .player.next .uniformNumber,
        .player.next.swap .subFor,
        .player.off .currentPosition,
        .player.off .subFor,
        .player.out .currentPosition,
        .player.out .playerPositions,
        .player.out .shiftTime,
        .player.out .subFor {
          display: none;
        }

        .themed {
          color: var(--mdc-theme-on-primary);
          background-color: var(--mdc-theme-primary);
        }
      </style>

      <span ?selected="${this.selected}" class="player ${classMap(classes)}">
        <mwc-icon id="icon" class="themed">${currentIcon}</mwc-icon>
        <span class="playerName">${player ? player.name : ''}</span>
        <span class="uniformNumber">${player ? player.uniformNumber : ''}</span>
        <span class="currentPosition">${currentPosition}</span>
        <span class="playerPositions">${positions.join(', ')}</span>
        <span class="shiftTime"><mwc-icon>timer</mwc-icon>${this.timer.text}</span>
        <span class="subFor">${subFor}</span>
      </span>
    `;
  }

  private timer = new SynchronizedTimerController(this);

  protected timerNotifier = new ContextConsumer(
    this,
    synchronizedTimerContext,
    (notifier /*, dispose*/) => {
      // TODO: implement dispose to unregister from notifications
      notifier.registerTimer(this.timer);
    },
    true // we want updates when the notifier changes
  );

  @contextProvided({ context: playerResolverContext, subscribe: true })
  @property({ attribute: false })
  playerResolver!: PlayerResolver;

  @property({ type: String })
  mode = '';

  @property({ type: Object })
  data?: PlayerCardData;

  @property({ type: Object })
  player?: LivePlayer;

  @property({ type: Object })
  timeTracker?: PlayerTimeTracker;

  @property({ type: Boolean })
  public get selected(): boolean {
    if (this._selected) {
      return true;
    }
    const player = this._getPlayer();
    if (player?.selected) {
      return true;
    }
    if (this.data?.position.selected) {
      return true;
    }
    return false;
  }
  public set selected(value: boolean) {
    const oldValue = this.selected;
    this._selected = value;
    this.requestUpdate('selected', oldValue);
  }
  private _selected = false;

  private _getPlayer() {
    return this.data ? this.data!.player : this.player;
  }

  override willUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has('timeTracker')) {
      return;
    }
    const oldValue = changedProperties.get('timeTracker');
    if (this.timeTracker === oldValue) {
      return;
    }

    this.timer.timer = this.timeTracker?.currentTimer;
  }

  override firstUpdated() {
    // Handles clicks anywhere on this component (i.e. not just on the contained span).
    this.addEventListener('click', this.toggleSelected);
  }

  private toggleSelected() {
    const newSelected = !this.selected;

    // Fires a position selected event, when |data| provided. Otherwise, fires a
    // player selected event.
    const player = this._getPlayer();
    if (this.data) {
      this.dispatchEvent(
        new CustomEvent(EVENT_POSITIONSELECTED, {
          bubbles: true,
          composed: true,
          detail: { position: this.data.position, player: player, selected: newSelected },
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent(EVENT_PLAYERSELECTED, {
          bubbles: true,
          composed: true,
          detail: { player: player, selected: newSelected },
        })
      );
    }
  }
}
