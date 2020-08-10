/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-textfield';
import { TextField } from '@material/mwc-textfield';
import { customElement, html, LitElement } from 'lit-element';
import { Team } from '../models/team';
import { EVENT_NEWTEAMCREATED } from './events';
import { SharedStyles } from './shared-styles';

// This element is *not* connected to the Redux store.
@customElement('lineup-team-create')
export class LineupTeamCreate extends LitElement {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
      </style>
      <mwc-textfield id="team-name" label="Team Name" required>
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
