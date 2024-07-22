/** @format */

import '@material/mwc-button';
import '@material/mwc-dialog';
import { Dialog } from '@material/mwc-dialog';
import '@material/mwc-formfield';
import { html, LitElement } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { GameMetadata } from '../models/game.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-game-create')
export class LineupGameCreate extends LitElement {
  override render() {
    return html`
      ${SharedStyles}
      <style>
        ul.fields {
          list-style-type: none;
        }
      </style>
      <mwc-dialog id="create-dialog" heading="New Game" @closed="${this.saveNewGame}">
        <ul class="fields">
          <li>
            <mwc-formfield id="nameField" alignend label="Name" dialogInitialFocus>
              <input type="text" required minlength="2" />
            </mwc-formfield>
          </li>
          <li>
            <mwc-formfield id="dateField" alignend label="Date">
              <input type="date" required />
            </mwc-formfield>
          </li>
          <li>
            <mwc-formfield id="timeField" alignend label="Time">
              <input type="time" required />
            </mwc-formfield>
          </li>
          <li>
            <mwc-formfield id="opponentField" alignend label="Opponent">
              <input type="text" required minlength="2" />
            </mwc-formfield>
          </li>
        </ul>
        <mwc-button slot="primaryAction" dialogAction="save">Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  async show() {
    this.resetFields();
    this.dialog!.show();
    this.requestUpdate();
    await this.updateComplete;
  }

  @query('mwc-dialog')
  protected dialog?: Dialog;

  private getFormInput(fieldId: string): HTMLInputElement {
    return this.shadowRoot!.querySelector(`#${fieldId} > input`) as HTMLInputElement;
  }

  private buildDate(dateString: string, timeString: string): { valid: boolean; date: Date } {
    // Parse the date and time values, to get date parts separately
    const dateParts = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!dateParts) {
      return { valid: false, date: new Date() };
    }

    const timeParts = timeString.match(/(\d{2}):(\d{2})/);
    if (!timeParts) {
      return { valid: false, date: new Date() };
    }

    // Construct the date object from the arrays of parts
    //  - Ignore element 0, which is the whole string match
    const date = new Date(
      Number(dateParts[1]), // years
      Number(dateParts[2]) - 1, // months, which are zero-based
      Number(dateParts[3]), // days
      Number(timeParts[1]), // hours
      Number(timeParts[2]), // minutes
    );

    return { valid: true, date };
  }

  private saveNewGame(e: CustomEvent) {
    if (e.detail.action !== 'save') {
      return;
    }
    const nameField = this.getFormInput('nameField');
    const dateField = this.getFormInput('dateField');
    const timeField = this.getFormInput('timeField');
    const opponentField = this.getFormInput('opponentField');

    const dateResult = this.buildDate(dateField.value!.trim(), timeField.value!.trim());
    if (!dateResult.valid) {
      // TODO: Some error handling?
      return;
    }

    const newGame: GameMetadata = {
      name: nameField.value!.trim(),
      date: dateResult.date,
      opponent: opponentField.value!.trim(),
    };

    // This event will be handled by lineup-view-games.
    this.dispatchEvent(
      new GameCreatedEvent({
        game: newGame,
      }),
    );
  }

  private resetFields() {
    const fields = this.shadowRoot!.querySelectorAll<HTMLInputElement>('mwc-formfield > input');
    for (const field of Array.from(fields)) {
      field.value = '';
    }
  }
}

export interface GameCreatedDetail {
  game: GameMetadata;
}

const CREATED_EVENT_NAME = 'game-created';
export class GameCreatedEvent extends CustomEvent<GameCreatedDetail> {
  static eventName = CREATED_EVENT_NAME;

  constructor(detail: GameCreatedDetail) {
    super(GameCreatedEvent.eventName, {
      detail,
      bubbles: true,
      composed: true,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-create': LineupGameCreate;
  }
}

declare global {
  interface HTMLElementEventMap {
    [CREATED_EVENT_NAME]: GameCreatedEvent;
  }
}
