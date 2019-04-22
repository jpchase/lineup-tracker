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
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      ${Object.keys(this.roster).map((key) => {
        const player = this.roster[key];
        return html`
          <div>
            <lineup-roster-item .isGame="false" .player="${player}"></lineup-roster-item>
          </div>
        `
      })}
    `;
  }

  @property({ type: Object })
  roster: Roster = {};
}

window.customElements.define('lineup-roster', LineupRoster);
