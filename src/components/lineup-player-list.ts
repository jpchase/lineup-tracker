/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

import { Player, Roster } from '../models/player';

// These are the elements needed by this element.
import '@material/mwc-button';
import './lineup-player-card';

import { EVENT_PLAYERLISTCANCEL } from './events';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

// This element is *not* connected to the Redux store.
@customElement('lineup-player-list')
export class LineupPlayerList extends LitElement {
  protected render() {
    const filteredPlayers = this._getFilteredPlayers();
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
      ${filteredPlayers.length > 0 ? html`
        <div class="list">
        ${repeat(filteredPlayers, (player: Player) => player.id, (player: Player /*, index: number*/) => html`
          <lineup-player-card .mode="${this.mode}" .player="${player}"></lineup-player-card>
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

  @property({type: String})
  mode = '';

  @property({type: Object})
  roster: Roster|undefined = undefined;

  @property({type: Boolean})
  showCancel = false;

  _getPlayerStatus(mode: string) {
    let status = mode.toUpperCase();
    switch (status) {
      case 'NEXT':
      case 'OFF':
      case 'ON':
      case 'OUT':
        return status;
      default:
        console.log('Unsupported mode:', mode);
    }
    return status;
  }

  _getFilteredPlayers(): Player[] {
    if (!this.roster) {
      return [];
    }
    const statusFilter = this._getPlayerStatus(this.mode);
    const roster = this.roster;
    return Object.keys(roster).reduce((result: Player[], key) => {
      const player = roster[key];
      if (player.status === statusFilter) {
        result.push(player);
      }
      return result;
    }, []);
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
