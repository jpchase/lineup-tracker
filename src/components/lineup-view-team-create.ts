/** @format */

import { contextProvided } from '@lit-labs/context';
import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { connect } from 'pwa-helpers/connect-mixin.js';
import { addNewTeam, team } from '../slices/team/team-slice.js';
import { OptionalReducer, store } from '../store.js';
import './lineup-team-create.js';
import { NewTeamCreatedEvent } from './lineup-team-create.js';
import { PageRouter, pageRouterContext } from './page-router.js';
import { PageViewElement } from './page-view-element.js';
import { SharedStyles } from './shared-styles.js';

// We are lazy loading its reducer.
store.addReducers({
  team: team as OptionalReducer<typeof team>,
});

@customElement('lineup-view-team-create')
export class LineupViewTeamCreate extends connect(store)(PageViewElement) {
  override render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>New Team</h2>
        <lineup-team-create @new-team-created="${this.newTeamCreated}"></lineup-team-create>
      </section>
    `;
  }

  @contextProvided({ context: pageRouterContext, subscribe: true })
  @property({ attribute: false })
  pageRouter!: PageRouter;

  private newTeamCreated(e: NewTeamCreatedEvent) {
    store.dispatch(addNewTeam(e.detail.team));
    // TODO: Pass page and params separately
    this.pageRouter.gotoPage(`/viewHome`);
  }
}
