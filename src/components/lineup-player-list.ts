/**
@license
*/

import '@material/mwc-button';
import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { LivePlayer } from '../models/live.js';
import { PlayerStatus } from '../models/player';
import { EVENT_PLAYERLISTCANCEL } from './events';
import './lineup-player-card';
import { PlayerListElement } from './player-list-element.js';
import { SharedStyles } from './shared-styles';

interface PlayerFilterFunc {
  (player: LivePlayer): boolean;
}

// This element is *not* connected to the Redux store.
@customElement('lineup-player-list')
export class LineupPlayerList extends PlayerListElement {
  override render() {
    const filteredPlayers = this._getFilteredPlayers();

    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
      ${filteredPlayers.length > 0 ? html`
        <div class="list">
        ${repeat(filteredPlayers, (player: LivePlayer) => player.id, (player: LivePlayer) => html`
          <lineup-player-card .mode="${this.mode}" .player="${player}" .timeTracker="${this.getTracker(player)}">
          </lineup-player-card>
          ${this.showCancel
        ? html`<mwc-button icon="cancel" @click="${this._doCancel}">Save</mwc-button>`
        : ''
      }
        `)}
        </div>
      ` : html`
        <p class="empty-list">
          No players.
        </p>
      `}
      </div>`
  }

  @property({ type: String })
  mode = '';

  @property({ type: Array })
  players: LivePlayer[] = [];

  @property({ type: Boolean })
  showCancel = false;

  _getPlayerFilter(mode: string): PlayerFilterFunc {
    let status = mode.toUpperCase();
    switch (status) {
      case PlayerStatus.Next:
      case PlayerStatus.Out:
        return (player) => {
          return (player.status === status);
        };
      case PlayerStatus.Off:
        return (player) => {
          return (!player.status || player.status === status);
        };
      default:
        return () => {
          console.log('Unsupported mode: ', mode);
          return false;
        };
    }
  }

  _getFilteredPlayers(): LivePlayer[] {
    if (!this.players) {
      return [];
    }
    const filterFunc = this._getPlayerFilter(this.mode);
    return this.players.filter(filterFunc);
  }

  _doCancel(e: CustomEvent) {
    console.log('_doCancel', e);
    // console.log('_doCancel - model.player', e.model.player);
    this.dispatchEvent(new CustomEvent(EVENT_PLAYERLISTCANCEL, {
      bubbles: true, composed: true,
      detail: {} // {player: e.model.player},
    }));
  }
}
