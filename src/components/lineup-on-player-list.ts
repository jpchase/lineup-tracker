/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

import { Player, Roster } from '../models/player';

// These are the elements needed by this element.
import '@material/mwc-button';
import './lineup-player-card';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

// This element is *not* connected to the Redux store.
@customElement('lineup-on-player-list')
export class LineupOnPlayerList extends LitElement {
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
          <lineup-player-card .mode="ON" .player="${player}"></lineup-player-card>
        `)}
        </div>
      ` : html`
        <p class="empty-list">
          No players.
        </p>
      `}
      </div>`
  }

  @property({type: Object})
  roster: Roster|undefined = undefined;

  _getFilteredPlayers(): Player[] {
    if (!this.roster) {
      return [];
    }
    const roster = this.roster;
    return Object.keys(roster).reduce((result: Player[], key) => {
      const player = roster[key];
      if (player.status === 'ON') {
        result.push(player);
      }
      return result;
    }, []);
  }
}
