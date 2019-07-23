/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';

import { Player } from '../models/player';

// These are the elements needed by this element.

import { EVENT_PLAYERSELECTED } from './events';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

export interface PlayerCardData {
  id: string;
  position: string;
  player?: Player;
}

// This element is *not* connected to the Redux store.
@customElement('lineup-player-card')
export class LineupPlayerCard extends LitElement {
  protected render() {
    if (!this.data && !this.player) {
      return;
    }
    let currentPosition = '';
    let player: Player | undefined;

    if (this.data) {
      currentPosition = this.data.position;
      player = this.data.player;
    } else {
      player = this.player!;
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
          width: 40px;
        }

        .player.on .playerPositions,
        .player.on .subFor,
        .player.next .playerPositions,
        .player.off .currentPosition,
        .player.off .subFor {
          display: none;
        }

      </style>

      <span class="player ${this.mode}" @click="${this._toggleSelected}">
        <span class="playerName">${player ? player.name : ''}</span>
        <span class="uniformNumber">${player ? player.uniformNumber: ''}</span>
        <span class="currentPosition">${currentPosition}</span>
        <span class="playerPositions">${positions.join(', ')}</span>
        <span class="subFor">{player.replaces}</span>
        <span class="shiftTime"></span>
      </span>
    `;
  }

  @property({type: String})
  mode = '';

  @property({type: Object})
  data: PlayerCardData|undefined = undefined;

  @property({type: Object})
  player: Player|undefined = undefined;

  @property({type: Boolean})
  selected = false;

  _toggleSelected(e: CustomEvent) {
    console.log('_toggleSelected - ' + this.selected, e);
    this.selected = !this.selected;
    const player = this.data ? this.data!.player : this.player;
    this.dispatchEvent(new CustomEvent(EVENT_PLAYERSELECTED, {
      bubbles: true, composed: true,
      detail: {player: player, selected: this.selected},
    }));
  }
}
