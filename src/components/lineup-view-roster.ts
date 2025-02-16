/** @format */

import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { RootState } from '../app/store.js';
import { Roster } from '../models/player.js';
import { selectCurrentTeam } from '../slices/app/index.js';
import {
  addNewPlayer,
  getRoster,
  getTeamSliceConfigurator,
  selectTeamRoster,
  selectTeamRosterLoaded,
} from '../slices/team/index.js';
import { SignedInAuthController } from './core/auth-controller.js';
import { ConnectStoreMixin } from './core/connect-mixin.js';
import { AuthorizedViewElement } from './core/page-view-element.js';
import './lineup-roster.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-view-roster')
export class LineupViewRoster extends ConnectStoreMixin(AuthorizedViewElement) {
  override renderView() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Team: ${this.teamName}</h2>
        <lineup-roster .roster="${this.roster}" @new-player-created="${this.newPlayerCreated}">
        </lineup-roster>
      </section>
    `;
  }

  @state()
  private teamId = '';

  @state()
  private teamName = '';

  @state()
  private roster: Roster = {};

  @state()
  private isLoaded = false;

  constructor() {
    super();
    this.registerSliceConfigurator(getTeamSliceConfigurator());
    this.registerController(new SignedInAuthController(this));
  }

  override stateChanged(state: RootState) {
    if (!this.authorized) {
      return;
    }
    const currentTeam = selectCurrentTeam(state);
    if (!currentTeam) {
      return;
    }
    if (this.teamId !== currentTeam.id) {
      this.teamId = currentTeam.id;
      return;
    }
    this.teamName = currentTeam.name;
    this.roster = selectTeamRoster(state) || {};
    this.isLoaded = !!selectTeamRosterLoaded(state);
  }

  // AuthorizedView overrides
  protected override keyPropertyName = 'teamId';

  protected override loadData() {
    if (this.teamId) {
      this.dispatch(getRoster(this.teamId));
    }
  }

  protected override resetDataProperties() {
    this.teamName = '';
    this.roster = {};
    this.isLoaded = false;
  }

  protected override isDataReady() {
    return this.isLoaded;
  }

  protected override getAuthorizedDescription(): string {
    return 'view team roster';
  }

  private newPlayerCreated(e: CustomEvent) {
    this.dispatch(addNewPlayer(e.detail.player));
  }
}
