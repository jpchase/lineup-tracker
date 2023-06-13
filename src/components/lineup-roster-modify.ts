/** @format */

import '@material/mwc-button';
import '@material/mwc-formfield';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { Player, PlayerStatus } from '../models/player.js';
import { SharedStyles } from './shared-styles.js';

export interface NewPlayerCreatedDetail {
  player: Player;
}

const NEW_PLAYER_CREATED_EVENT_NAME = 'new-player-created';
export class NewPlayerCreatedEvent extends CustomEvent<NewPlayerCreatedDetail> {
  static eventName = NEW_PLAYER_CREATED_EVENT_NAME;

  constructor(detail: NewPlayerCreatedDetail) {
    super(NewPlayerCreatedEvent.eventName, {
      detail,
      bubbles: true,
      composed: true,
    });
  }
}

const NEW_PLAYER_CANCELLED_EVENT_NAME = 'new-player-cancelled';
export class NewPlayerCancelledEvent extends CustomEvent<{}> {
  static eventName = NEW_PLAYER_CANCELLED_EVENT_NAME;

  constructor() {
    super(NewPlayerCreatedEvent.eventName, {
      detail: {},
      bubbles: true,
      composed: true,
    });
  }
}

@customElement('lineup-roster-modify')
export class LineupRosterModify extends LitElement {
  override render() {
    return html` ${SharedStyles}
      <style>
        :host {
          display: block;
        }
      </style>
      <div>
        <h2>New Player</h2>
        <mwc-formfield id="nameField" alignend label="Name">
          <input type="text" required minlength="2" />
        </mwc-formfield>
        <mwc-formfield id="uniformNumberField" alignend label="Uniform Number">
          <input type="number" required min="1" max="99" />
        </mwc-formfield>
        <div class="buttons">
          <mwc-button raised class="cancel" @click="${this.cancelModify}">Cancel</mwc-button>
          <mwc-button raised class="save" @click="${this.savePlayer}">Save</mwc-button>
        </div>
      </div>`;
  }

  private getFormInput(fieldId: string): HTMLInputElement {
    return this.shadowRoot!.querySelector(`#${fieldId} > input`) as HTMLInputElement;
  }

  private savePlayer(/* e: CustomEvent */) {
    const nameField = this.getFormInput('nameField');
    const uniformNumberField = this.getFormInput('uniformNumberField');

    const newPlayer: Player = {
      id: '',
      name: nameField.value!.trim(),
      uniformNumber: Number(uniformNumberField.value!.trim()),
      positions: [], // TODO: Positions
      status: PlayerStatus.Off,
    };

    // This event will be handled by lineup-roster.
    this.dispatchEvent(new NewPlayerCreatedEvent({ player: newPlayer }));
  }

  private cancelModify() {
    // This event will be handled by lineup-roster.
    this.dispatchEvent(new NewPlayerCancelledEvent());
  }
}

declare global {
  interface HTMLElementEventMap {
    [NEW_PLAYER_CREATED_EVENT_NAME]: NewPlayerCreatedEvent;
    [NEW_PLAYER_CANCELLED_EVENT_NAME]: NewPlayerCancelledEvent;
  }
}
