/** @format */

import { consume } from '@lit/context';
import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { addNewTeam, getTeamSliceConfigurator } from '../slices/team/index.js';
import { SignedInAuthController } from './core/auth-controller.js';
import { ConnectStoreMixin } from './core/connect-mixin.js';
import { PageRouter, pageRouterContext } from './core/page-router.js';
import { AuthorizedViewElement } from './core/page-view-element.js';
import './lineup-team-create.js';
import { NewTeamCreatedEvent } from './lineup-team-create.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-view-team-create')
export class LineupViewTeamCreate extends ConnectStoreMixin(AuthorizedViewElement) {
  override renderView() {
    return html`
      ${SharedStyles}
      <section>
        <h2>New Team</h2>
        <lineup-team-create @new-team-created="${this.newTeamCreated}"></lineup-team-create>
      </section>
    `;
  }

  @consume({ context: pageRouterContext, subscribe: true })
  @property({ attribute: false })
  pageRouter!: PageRouter;

  constructor() {
    super();
    this.registerSliceConfigurator(getTeamSliceConfigurator());
    this.registerController(new SignedInAuthController(this));
  }

  protected override isReadyOnAuthorization(): boolean {
    return true;
  }

  protected override getAuthorizedDescription(): string {
    return 'create a new team';
  }

  private newTeamCreated(e: NewTeamCreatedEvent) {
    this.dispatch(addNewTeam(e.detail.team));
    // TODO: Pass page and params separately
    this.pageRouter.gotoPage(`/viewHome`);
  }
}
