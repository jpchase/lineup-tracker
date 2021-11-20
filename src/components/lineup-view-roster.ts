/**
@license
*/

import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element';

import { Roster } from '../models/player';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store';
import { TeamState } from '../slices/team/team-slice.js';

// We are lazy loading its reducer.
import { team } from '../slices/team/team-slice.js';
store.addReducers({
  team
});

// These are the actions needed by this element.
import { addNewPlayer, getRoster } from '../actions/team';

// These are the elements needed by this element.
import './lineup-roster';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

@customElement('lineup-view-roster')
export class LineupViewRoster extends connect(store)(PageViewElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Team: ${this._teamName}</h2>
        <lineup-roster .roster="${this._roster}" @newplayercreated="${this.newPlayerCreated}">
        </lineup-roster>
      </section>
    `;
  }

  @state()
  private _teamId = '';

  @state()
  private _teamName: string = '';

  @state()
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

  private newPlayerCreated(e: CustomEvent) {
    store.dispatch(addNewPlayer(e.detail.player));
  }

}
