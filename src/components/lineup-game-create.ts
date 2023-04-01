import '@material/mwc-button';
import '@material/mwc-formfield';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { GameMetadata } from '../models/game.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-game-create')
export class LineupGameCreate extends LitElement {
  override render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
        <h2>New Game</h2>
        <mwc-formfield id="nameField" alignend label="Name">
            <input type="text" required minlength="2">
        </mwc-formfield>
        <mwc-formfield id="dateField" alignend label="Date">
            <input type="date" required>
        </mwc-formfield>
        <mwc-formfield id="timeField" alignend label="Time">
            <input type="time" required>
        </mwc-formfield>
        <mwc-formfield id="opponentField" alignend label="Opponent">
            <input type="text" required minlength="2">
        </mwc-formfield>
        <div class="buttons">
          <mwc-button raised class="cancel" @click="${this.cancelNewGame}">Cancel</mwc-button>
          <mwc-button raised class="save" autofocus @click="${this.saveNewGame}">Save</mwc-button>
        </div>
      </div>`
  }

  private getFormInput(fieldId: string): HTMLInputElement {
    return this.shadowRoot!.querySelector(`#${fieldId} > input`) as HTMLInputElement;
  }

  private buildDate(dateString: string, timeString: string): { valid: boolean, date: Date } {
    // Parse the date and time values, to get date parts separately
    let dateParts = dateString.match(/(\d{4})\-(\d{2})\-(\d{2})/);
    if (!dateParts) {
      return { valid: false, date: new Date() };
    }

    let timeParts = timeString.match(/(\d{2}):(\d{2})/);
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
      Number(timeParts[2]) // minutes
    );

    return { valid: true, date: date };
  }

  private saveNewGame(_e: CustomEvent) {
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
    this.dispatchEvent(new GameCreatedEvent({
      game: newGame
    }));

    this.resetFields();
  }

  private cancelNewGame(_e: CustomEvent) {
    this.resetFields();
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
      composed: true
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
