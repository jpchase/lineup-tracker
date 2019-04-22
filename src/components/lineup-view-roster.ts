/**
@license
*/

import { html, property } from 'lit-element';
import { PageViewElement } from './page-view-element.js';

import { Roster } from '../models/team.js';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store.js';
import { TeamState } from '../reducers/team.js';

// We are lazy loading its reducer.
import team from '../reducers/team.js';
store.addReducers({
    team
});

// These are the actions needed by this element.
import { getRoster } from '../actions/team.js';

// These are the elements needed by this element.
import './lineup-roster.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

class LineupViewRoster extends connect(store)(PageViewElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Team: ${this._teamName}</h2>
        <lineup-roster .roster="${this._roster}"></lineup-roster>
      </section>
    `;
  }

  @property({ type: String })
  private _teamId = '';

  @property({ type: String })
  private _teamName: string = '';

  @property({ type: Object })
  private _roster: Roster = {};

  // This is called every time something is updated in the store.
  stateChanged(state: RootState) {
    if (!state.team) {
      return;
    }
    const teamState: TeamState = state.team!;
    if (this._teamId !== teamState.teamId) {
      this._teamId = teamState.teamId;
      store.dispatch(getRoster(this._teamId));
    }
    this._teamName = teamState.teamName;
    this._roster = teamState.roster;
  }

}

window.customElements.define('lineup-view-roster', LineupViewRoster);
