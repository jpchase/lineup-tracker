/**
@license
*/

import { LitElement, html, property } from 'lit-element';

import { Roster } from '../models/team.js';

// These are the elements needed by this element.
import './lineup-roster-item.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

// This element is *not* connected to the Redux store.
class LineupRoster extends LitElement {
  protected render() {
    const roster = this.roster;
    const playerList = roster ? Object.keys(roster).map(key => roster[key]) : [];
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
      ${playerList.length > 0 ? html`
        <div class="list">
        ${playerList.map(player => html`
          <div>
            <lineup-roster-item .isGame="false" .player="${player}">
            </lineup-roster-item>
          </div>
        `)}
        </div>
      ` : html`
        <p class="empty-list">
          No players in roster.
        </p>
      `}
      </div>`
  }

  @property({ type: Object })
  roster: Roster = {};
}

window.customElements.define('lineup-roster', LineupRoster);
