/**
@license
*/

import { LitElement, html, property } from 'lit-element';

import { Player } from '../models/team.js';

// These are the elements needed by this element.

import { EVENT_PLAYERSELECTED } from './events.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

// This element is *not* connected to the Redux store.
class LineupPlayerCard extends LitElement {
  protected render() {
    const player = this.player!;
    const positions = player.positions || [];
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

      <span class="player ${this.mode}" @click="{this._toggleSelected}">
        <span class="playerName">${player.name}</span>
        <span class="uniformNumber">${player.uniformNumber}</span>
        <span class="currentPosition">{player.currentPosition}</span>
        <span class="playerPositions">${positions.join(', ')}</span>
        <span class="subFor">{player.replaces}</span>
        <span class="shiftTime"></span>
      </span>
    `;
  }

  @property({type: String})
  mode = '';

  @property({type: Object})
  player: Player|undefined = undefined;

  @property({type: Boolean})
  selected = false;

  _toggleSelected(e: CustomEvent) {
    console.log('_toggleSelected - ' + this.selected, e);
    this.dispatchEvent(new CustomEvent(EVENT_PLAYERSELECTED, {
      bubbles: true, composed: true,
      detail: {player: this.player, selected: this.selected},
    }));
  }
}

window.customElements.define('lineup-player-card', LineupPlayerCard);
