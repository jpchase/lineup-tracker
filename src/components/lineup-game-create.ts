import '@material/mwc-button';
import '@material/mwc-formfield';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { GameMetadata } from '../models/game.js';
import { EVENT_NEWGAMECREATED } from './events.js';
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
        <mwc-formfield id="durationField" alignend label="Game Length">
            <input type="number" required min="20" max="90">
        </mwc-formfield>
        <div class="buttons">
          <mwc-button raised class="cancel" @click="${this._cancelCreateGame}">Cancel</mwc-button>
          <mwc-button raised class="save" autofocus @click="${this._saveNewGame}">Save</mwc-button>
        </div>
      </div>`
  }

  private _getFormInput(fieldId: string): HTMLInputElement {
    return this.shadowRoot!.querySelector(`#${fieldId} > input`) as HTMLInputElement;
  }

  private _buildDate(dateString: string, timeString: string): { valid: boolean, date: Date } {
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

    console.log(`Built date is: ${date}`);

    return { valid: true, date: date };
  }

  private _saveNewGame(e: CustomEvent) {
    console.log(`_saveNewGame: ${JSON.stringify(e.detail)}`);

    const nameField = this._getFormInput('nameField');
    const dateField = this._getFormInput('dateField');
    const timeField = this._getFormInput('timeField');
    const opponentField = this._getFormInput('opponentField');
    // const durationField = this._getFormInput('durationField');

    console.log(`Date is: ${dateField.value!.trim()}`);
    console.log(`Time is: ${timeField.value!.trim()}`);

    const dateResult = this._buildDate(dateField.value!.trim(), timeField.value!.trim());
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
    this.dispatchEvent(new CustomEvent(EVENT_NEWGAMECREATED, {
      bubbles: true, composed: true, detail: {
        game: newGame
      }
    }));
  }

  private _cancelCreateGame(e: CustomEvent) {
    console.log(`_cancelCreateGame: ${JSON.stringify(e.detail)}`);
  }
}
