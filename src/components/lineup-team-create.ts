/** @format */

import '@material/mwc-button';
import '@material/mwc-textfield';
import { TextField } from '@material/mwc-textfield';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Team } from '../models/team.js';
import { SharedStyles } from './shared-styles.js';

export interface NewTeamCreatedDetail {
  team: Team;
}

const NEW_TEAM_EVENT_NAME = 'new-team-created';
export class NewTeamCreatedEvent extends CustomEvent<NewTeamCreatedDetail> {
  static eventName = NEW_TEAM_EVENT_NAME;

  constructor(detail: NewTeamCreatedDetail) {
    super(NewTeamCreatedEvent.eventName, {
      detail,
      bubbles: true,
      composed: true,
    });
  }
}

@customElement('lineup-team-create')
export class LineupTeamCreate extends LitElement {
  override render() {
    return html`
      ${SharedStyles}
      <style></style>
      <mwc-textfield id="team-name" label="Team Name" required maxLength="30"></mwc-textfield>
      <div class="buttons">
        <mwc-button raised class="save" @click="${this._saveNewTeam}">Save</mwc-button>
        <mwc-button class="cancel" @click="${this._cancelCreateTeam}">Cancel</mwc-button>
      </div>
    `;
  }

  private _saveNewTeam(/*e: CustomEvent*/) {
    const nameField = this.shadowRoot!.querySelector<TextField>('#team-name')!;
    const newTeam: Team = {
      id: '',
      name: nameField.value.trim(),
    };

    // This event will be handled by lineup-view-team-create.
    this.dispatchEvent(new NewTeamCreatedEvent({ team: newTeam }));
  }

  private _cancelCreateTeam(/*e: CustomEvent*/) {}
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-team-create': LineupTeamCreate;
  }
}

declare global {
  interface HTMLElementEventMap {
    [NEW_TEAM_EVENT_NAME]: NewTeamCreatedEvent;
  }
}
