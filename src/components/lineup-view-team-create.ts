/**
@license
*/

import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { connect } from 'pwa-helpers/connect-mixin.js';
import { navigate } from '../slices/app/app-slice.js';
import { addNewTeam, team } from '../slices/team/team-slice.js';
import { RootState, store } from '../store';
import { EVENT_NEWTEAMCREATED } from './events';
import './lineup-team-create';
import { PageViewElement } from './page-view-element';
import { SharedStyles } from './shared-styles';

// We are lazy loading its reducer.
store.addReducers({
  team
});

// This element is connected to the Redux store.
@customElement('lineup-view-team-create')
export class LineupViewTeamCreate extends connect(store)(PageViewElement) {
  override render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>New Team</h2>
        <lineup-team-create></lineup-team-create>
      </section>
    `;
  }

  override firstUpdated() {
    window.addEventListener(EVENT_NEWTEAMCREATED, this._newTeamCreated.bind(this) as EventListener);
  }

  override stateChanged(state: RootState) {
    if (!state.team) {
      return;
    }
  }

  private _newTeamCreated(e: CustomEvent) {
    store.dispatch(addNewTeam(e.detail.team));
    window.history.pushState({}, '', `/viewHome`);
    store.dispatch(navigate(window.location));
  }

}
