/**
@license
*/

import { LitElement, html, property } from 'lit-element';
import { connect } from 'pwa-helpers/connect-mixin.js';

import { Roster } from '../models/team.js';

// This element is connected to the Redux store.
import { store, RootState } from '../store.js';

// We are lazy loading its reducer.
import team from '../reducers/team.js';
store.addReducers({
  team
});

// These are the actions needed by this element.
import { getRoster } from '../actions/team.js';

// These are the elements needed by this element.
import './lineup-roster-item.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

class LineupRoster extends connect(store)(LitElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      ${Object.keys(this._roster).map((key) => {
        const player = this._roster[key];
        return html`
          <div>
            <lineup-roster-item .isGame="false" .player="${player}"></lineup-roster-item>
          </div>
        `
      })}
    `;
  }

  @property({type: Object})
  private _roster: Roster = {};

  protected firstUpdated() {
    store.dispatch(getRoster());
  }

  // This is called every time something is updated in the store.
  stateChanged(state: RootState) {
    this._roster = state.team!.roster;
  }
}

window.customElements.define('lineup-roster', LineupRoster);
