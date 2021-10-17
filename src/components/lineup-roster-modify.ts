/**
@license
*/

import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

import { Player, PlayerStatus } from '../models/player';

// These are the elements needed by this element.
import '@material/mwc-button';
import '@material/mwc-formfield';

import { EVENT_NEWPLAYERCREATED, EVENT_NEWPLAYERCANCELLED } from './events';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

// This element is *not* connected to the Redux store.
@customElement('lineup-roster-modify')
export class LineupRosterModify extends LitElement {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
        <h2>New Player</h2>
        <mwc-formfield id="nameField" alignend label="Name">
            <input type="text" required minlength="2">
        </mwc-formfield>
        <mwc-formfield id="uniformNumberField" alignend label="Uniform Number">
            <input type="number" required min="1" max="99">
        </mwc-formfield>
        <div class="buttons">
          <mwc-button raised class="cancel" @click="${this._cancelModify}">Cancel</mwc-button>
          <mwc-button raised class="save" autofocus @click="${this._savePlayer}">Save</mwc-button>
        </div>
      </div>`
  }

  private _getFormInput(fieldId: string): HTMLInputElement {
    return this.shadowRoot!.querySelector(`#${fieldId} > input`) as HTMLInputElement;
  }

  private _savePlayer(e: CustomEvent) {
    console.log(`_savePlayer: ${JSON.stringify(e.detail)}`);

    const nameField = this._getFormInput('nameField');
    const uniformNumberField = this._getFormInput('uniformNumberField');

    const newPlayer: Player = {
      id: '',
      name: nameField.value!.trim(),
      uniformNumber: Number(uniformNumberField.value!.trim()),
      positions: [], // TODO: Positions
      status: PlayerStatus.Off
    };

    // This event will be handled by lineup-roster.
    this.dispatchEvent(new CustomEvent(EVENT_NEWPLAYERCREATED, {
      bubbles: true, composed: true, detail: {
        player: newPlayer
      }
    }));
  }

  private _cancelModify(e: CustomEvent) {
    console.log(`_cancelModify: ${JSON.stringify(e.detail)}`);
    // This event will be handled by lineup-roster.
    this.dispatchEvent(new CustomEvent(EVENT_NEWPLAYERCANCELLED, {
      bubbles: true, composed: true
    }));
  }
}
