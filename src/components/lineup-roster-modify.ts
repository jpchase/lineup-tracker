/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-formfield';
import { customElement, html, LitElement, property } from 'lit-element';
import { Player, PlayerStatus } from '../models/player';
import { SharedStyles } from './shared-styles';

export enum ModifyMode {
  Create = 'create',
  Edit = 'edit',
}

export class PlayerModifiedEvent extends CustomEvent<Player> {
  mode: ModifyMode;

  constructor(player: Player, mode: ModifyMode, eventName: string) {
    super(eventName, {
      detail: player,
      bubbles: true,
      composed: true
    });
    this.mode = mode;
  }
}

const PLAYER_CREATED_EVENT_NAME = 'player-created';
export class PlayerCreatedEvent extends PlayerModifiedEvent {
  static eventName = PLAYER_CREATED_EVENT_NAME;

  constructor(player: Player) {
    super(player, ModifyMode.Create, PlayerCreatedEvent.eventName);
  }
}

const PLAYER_EDITED_EVENT_NAME = 'player-edited';
export class PlayerEditedEvent extends PlayerModifiedEvent {
  static eventName = PLAYER_EDITED_EVENT_NAME;

  constructor(player: Player) {
    super(player, ModifyMode.Edit, PlayerEditedEvent.eventName);
  }
}

export class PlayerModifyCancelledEvent extends CustomEvent<{ mode: ModifyMode }> {
  constructor(mode: ModifyMode, eventName: string) {
    super(eventName, {
      detail: { mode },
      bubbles: true,
      composed: true
    });
  }
}

const PLAYER_CREATE_CANCELLED_EVENT_NAME = 'player-create-cancelled';
export class PlayerCreateCancelledEvent extends PlayerModifyCancelledEvent {
  static eventName = PLAYER_CREATE_CANCELLED_EVENT_NAME;

  constructor() {
    super(ModifyMode.Create, PlayerCreateCancelledEvent.eventName);
  }
}

const PLAYER_EDIT_CANCELLED_EVENT_NAME = 'player-edit-cancelled';
export class PlayerEditCancelledEvent extends PlayerModifyCancelledEvent {
  static eventName = PLAYER_EDIT_CANCELLED_EVENT_NAME;

  constructor() {
    super(ModifyMode.Edit, PlayerEditCancelledEvent.eventName);
  }
}

declare global {
  interface HTMLElementEventMap {
    [PLAYER_CREATED_EVENT_NAME]: PlayerCreatedEvent;
    [PLAYER_CREATE_CANCELLED_EVENT_NAME]: PlayerCreateCancelledEvent;
    [PLAYER_EDITED_EVENT_NAME]: PlayerEditedEvent;
    [PLAYER_EDIT_CANCELLED_EVENT_NAME]: PlayerEditCancelledEvent;
  }
}

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
          <mwc-button raised class="cancel" @click="${this.cancelModify}">Cancel</mwc-button>
          <mwc-button raised class="save" autofocus @click="${this.savePlayer}">Save</mwc-button>
        </div>
      </div>`
  }

  @property({ type: String })
  mode: '' | ModifyMode = '';

  // TODO: Change to using mwc-textfield instead (it handles all the input complexities)
  private _getFormInput(fieldId: string): HTMLInputElement {
    return this.shadowRoot!.querySelector(`#${fieldId} > input`) as HTMLInputElement;
  }

  private savePlayer(e: CustomEvent) {
    console.log(`savePlayer[${this.mode}]: ${JSON.stringify(e.detail)}`);

    const nameField = this._getFormInput('nameField');
    const uniformNumberField = this._getFormInput('uniformNumberField');

    // TODO: Validation
    const newPlayer: Player = {
      id: '',
      name: nameField.value!.trim(),
      uniformNumber: Number(uniformNumberField.value!.trim()),
      positions: [], // TODO: Positions
      status: PlayerStatus.Off
    };

    // This event will be handled by lineup-roster.
    this.dispatchEvent(new PlayerCreatedEvent(newPlayer));
  }

  private cancelModify(/*e: CustomEvent*/) {
    // This event will be handled by lineup-roster.
    this.dispatchEvent(new PlayerCreateCancelledEvent());
  }
}
