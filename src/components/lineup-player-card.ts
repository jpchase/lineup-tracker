/**
@license
*/

import { html, LitElement, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Position } from '../models/formation';
import { LivePlayer } from '../models/game';
import { PlayerTimeTracker } from '../models/shift.js';
import { EVENT_PLAYERSELECTED, EVENT_POSITIONSELECTED } from './events';
import { SharedStyles } from './shared-styles';
import { TimerController } from './timer-controller.js';

export interface PlayerCardData {
  id: string;
  position: Position;
  player?: LivePlayer;
}

// This element is *not* connected to the Redux store.
@customElement('lineup-player-card')
export class LineupPlayerCard extends LitElement {
  protected render() {
    if (!this.data && !this.player) {
      return;
    }
    let currentPosition = '';
    let player: LivePlayer | undefined;

    if (this.data) {
      currentPosition = this.data.position.type;
      player = this.data.player;
    } else {
      player = this.player!;
    }
    if (player && player.currentPosition) {
      currentPosition = player.currentPosition.type;
    }
    const positions: string[] = [];//player.positions || [];
    return html`
      ${SharedStyles}
      <style>

        .player {
          border: 1px;
          border-style: dashed;
          display: inline-block;
          height: 45px;
          width: 100px;
        }

        .player[selected] {
          border: 2px;
          border-style: solid;
        }

        .player.on .playerPositions,
        .player.on .subFor,
        .player.next .playerPositions,
        .player.off .currentPosition,
        .player.off .subFor
        .player.out .shiftTime {
          display: none;
        }

      </style>

      <span ?selected="${this.selected}" class="player ${this.mode.toLowerCase()}">
        <span class="playerName">${player ? player.name : ''}</span>
        <span class="uniformNumber">${player ? player.uniformNumber : ''}</span>
        <span class="currentPosition">${currentPosition}</span>
        <span class="playerPositions">${positions.join(', ')}</span>
        <!-- <span class="subFor">{player.replaces}</span> -->
        <span class="shiftTime">${this.timer.text}</span>
      </span>
    `;
  }

  private timer = new TimerController(this);

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

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has('timeTracker')) {
      return;
    }
    const oldValue = changedProperties.get('timeTracker');
    if (this.timeTracker === oldValue) {
      return;
    }

    this.timer.timer = this.timeTracker?.currentTimer;
  }

  protected firstUpdated() {
    // Handles clicks anywhere on this component (i.e. not just on the contained span).
    this.addEventListener('click', this._toggleSelected);
  }

  _toggleSelected(e: Event) {
    console.log('_toggleSelected - ' + this.selected, e);
    const newSelected = !this.selected;

    // Fires a position selected event, when |data| provided. Otherwise, fires a
    // player selected event.
    const player = this._getPlayer();
    if (this.data) {
      this.dispatchEvent(new CustomEvent(EVENT_POSITIONSELECTED, {
        bubbles: true, composed: true,
        detail: { position: this.data.position, player: player, selected: newSelected },
      }));
    } else {
      this.dispatchEvent(new CustomEvent(EVENT_PLAYERSELECTED, {
        bubbles: true, composed: true,
        detail: { player: player, selected: newSelected },
      }));
    }
  }
}
