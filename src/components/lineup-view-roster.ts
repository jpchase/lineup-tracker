/** @format */

import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { connect } from 'pwa-helpers/connect-mixin.js';
import { Roster } from '../models/player.js';
import { selectCurrentTeam } from '../slices/app/index.js';
import { addNewPlayer, getRoster, getTeamSliceConfigurator } from '../slices/team/index.js';
import { RootState, store } from '../store.js';
import './lineup-roster.js';
import { PageViewElement } from './page-view-element.js';
import { SharedStyles } from './shared-styles.js';

// We are lazy loading its reducer.
const teamConfigurator = getTeamSliceConfigurator();
teamConfigurator(store);

@customElement('lineup-view-roster')
export class LineupViewRoster extends connect(store)(PageViewElement) {
  override render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Team: ${this._teamName}</h2>
        <lineup-roster .roster="${this._roster}" @new-player-created="${this.newPlayerCreated}">
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
  override stateChanged(state: RootState) {
    const currentTeam = selectCurrentTeam(state);
    if (!currentTeam) {
      return;
    }
    if (!state.team) {
      return;
    }
    const teamState = state.team!;
    if (this._teamId !== currentTeam.id) {
      this._teamId = currentTeam.id;
      store.dispatch(getRoster(this._teamId));
      return;
    }
    this._teamName = currentTeam.name;
    this._roster = teamState.roster;
  }

  private newPlayerCreated(e: CustomEvent) {
    store.dispatch(addNewPlayer(e.detail.player));
  }
}
