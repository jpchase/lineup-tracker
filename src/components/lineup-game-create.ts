/**
@license
*/

import { LitElement, html } from 'lit-element';

import { GameMetadata } from '../models/game.js';

// These are the elements needed by this element.
import '@material/mwc-button';
import '@material/mwc-formfield';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import { PaperInputElement } from '@polymer/paper-input/paper-input.js';

import { EVENT_NEWGAMECREATED } from './events.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

// This element is *not* connected to the Redux store.
class LineupGameCreate extends LitElement {
  protected render() {
    // const games = this.games;
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
        <h2>New Game</h2>
        <paper-input always-float-label id="idField"
            label="ID"
            minLength="2"
            errorMessage="Must specify an ID"></paper-input>
        <mwc-formfield always-float-label id="nameField"
            label="ID"
            minLength="2"
            errorMessage="Must specify an ID"></mwc-formfield>
        <paper-input always-float-label id="dateField"
            label="Date"
            type="date"
            errorMessage="Must specify a valid date and time"></paper-input>
        <paper-input always-float-label id="timeField"
            label="Time"
            type="time"
            errorMessage="Must specify a valid date and time"></paper-input>
        <paper-input always-float-label id="opponentField"
            label="Opponent"
            minLength="2"
            errorMessage="Must specify an opponent"></paper-input>
        <paper-input always-float-label id="durationField"
            label="Game Length"
            type="number" min="1" max="90"
            errorMessage="Must specify a valid game length"></paper-input>
        <div class="buttons">
          <mwc-button raised dialog-dismiss on-tap="_cancelCreateGame">Cancel</mwc-button>
          <mwc-button raised dialog-confirm autofocus @click="${this._saveNewGame}">Save</mwc-button>
        </div>
      </div>`
  }

    private _saveNewGame(e: CustomEvent) {
        console.log(`_saveNewGame: ${JSON.stringify(e.detail)}`);

        const nameField = this.shadowRoot!.querySelector('paper-input#idField') as PaperInputElement;
        const dateField = this.shadowRoot!.querySelector('paper-input#dateField') as PaperInputElement;
        // const timeField = this.shadowRoot!.querySelector('paper-input#timeField') as PaperInputElement;
        const opponentField = this.shadowRoot!.querySelector('paper-input#opponentField') as PaperInputElement;
        // const durationField = this.shadowRoot!.querySelector('paper-input#durationField') as PaperInputElement;

        const newGame: GameMetadata = {
            name: nameField.value!.trim(),
            date: new Date(Date.parse(dateField.value!.trim())),
            opponent: opponentField.value!.trim()
        };

        // This event will be handled by lineup-view-games.
        this.dispatchEvent(new CustomEvent(EVENT_NEWGAMECREATED, {
            bubbles: true, composed: true, detail: {
                game: newGame
            }
        }));
    }
}

window.customElements.define('lineup-game-create', LineupGameCreate);
