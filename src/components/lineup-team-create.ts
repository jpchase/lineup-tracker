import '@material/mwc-button';
import '@material/mwc-textfield';
import { TextField } from '@material/mwc-textfield';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Team } from '../models/team.js';
import { EVENT_NEWTEAMCREATED } from './events.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-team-create')
export class LineupTeamCreate extends LitElement {
  override render() {
    return html`
      ${SharedStyles}
      <style>
      </style>
      <mwc-textfield id="team-name" label="Team Name" required maxLength="30">
      </mwc-textfield>
      <div class="buttons">
        <mwc-button raised class="save" autofocus @click="${this._saveNewTeam}">Save</mwc-button>
        <mwc-button class="cancel" @click="${this._cancelCreateTeam}">Cancel</mwc-button>
      </div>
    `;
  }

  private _saveNewTeam(e: CustomEvent) {
    console.log(`_saveNewTeam: ${JSON.stringify(e.detail)}`);

    const nameField = this.shadowRoot!.querySelector('#team-name') as TextField;
    const newTeam: Team = {
      id: '',
      name: nameField.value.trim()
    };

    // This event will be handled by lineup-view-team-create.
    this.dispatchEvent(new CustomEvent(EVENT_NEWTEAMCREATED, {
      bubbles: true, composed: true, detail: {
        team: newTeam
      }
    }));
  }

  private _cancelCreateTeam(e: CustomEvent) {
    console.log(`_cancelCreateTeam: ${JSON.stringify(e.detail)}`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-team-create': LineupTeamCreate;
  }
}
