/**
@license
*/

import { html, property } from '@polymer/lit-element';
import { PageViewElement } from './page-view-element.js';

// import { Team } from '../models/team.js';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store.js';

// We are lazy loading its reducer.
import team from '../reducers/team.js';
store.addReducers({
    team
});

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
        <lineup-roster></lineup-roster>
      </section>
    `;
  }

  @property({ type: String })
  private _teamName: string = '';

  // This is called every time something is updated in the store.
  stateChanged(state: RootState) {
    this._teamName = state.team!.teamName;
  }

}

window.customElements.define('lineup-view-roster', LineupViewRoster);
