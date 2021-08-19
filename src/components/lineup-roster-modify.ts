/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-formfield';
import { customElement, html, LitElement, property, query } from 'lit-element';
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

@customElement('lineup-roster-modify')
export class LineupRosterModify extends LitElement {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
        <h2>${this.renderHeader()}</h2>
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

  protected renderHeader() {
    switch (this.mode) {
      case ModifyMode.Create:
        return html`New Player`;

      case ModifyMode.Edit:
        if (!this.player) {
          return html`Edit Player`;
        }
        return html`Edit Player: ${this.player.name}`;

      default:
        return html`Player`;
    }
  }

  // TODO: Change to using mwc-textfield instead (it handles all the input complexities)
  @query('#nameField > input')
  nameField!: HTMLInputElement;

  @query('#uniformNumberField > input')
  uniformNumberField!: HTMLInputElement;

  @property({ type: String })
  get mode() {
    return this.mode_;
  }
  set mode(value: ModifyMode | undefined) {
    const oldValue = this.mode_;
    this.mode_ = value;
    if (value !== oldValue) {
      this.updateInitialValues();
    }
    this.requestUpdate('mode', oldValue);
  }

  @property({ type: Object })
  get player() {
    return this.player_;
  }
  set player(value: Player | undefined) {
    const oldValue = this.player_;
    this.player_ = value;
    if (value !== oldValue) {
      this.updateInitialValues();
    }
    this.requestUpdate('player', oldValue);
  }

  private mode_?: ModifyMode;
  private player_?: Player;

  private updateInitialValues() {
    let initialPlayerName = '';
    let initialPlayerNumber = '';
    if (this.mode === ModifyMode.Edit && this.player) {
      initialPlayerName = this.player.name;
      initialPlayerNumber = `${this.player.uniformNumber}`;
    }

    if (this.nameField) {
      this.nameField.value = initialPlayerName;
    }
    if (this.uniformNumberField) {
      this.uniformNumberField.value = initialPlayerNumber;
    }
  }

  private savePlayer(e: CustomEvent) {
    console.log(`savePlayer[${this.mode}]: ${JSON.stringify(e.detail)}`);

    // TODO: Validation
    const nameValue = this.nameField.value!.trim();
    const uniformNumberValue = Number(this.uniformNumberField.value!.trim());

    let modifiedPlayer: Player;
    let modifiedEvent: PlayerModifiedEvent;
    switch (this.mode) {
      case ModifyMode.Create:
        modifiedPlayer = {
          id: '',
          name: nameValue,
          uniformNumber: uniformNumberValue,
          positions: [], // TODO: Positions
          status: PlayerStatus.Off
        };
        modifiedEvent = new PlayerCreatedEvent(modifiedPlayer);
        break;

      case ModifyMode.Edit:
        if (!this.player) {
          return;
        }
        modifiedPlayer = {
          ...this.player,
          name: nameValue,
          uniformNumber: uniformNumberValue,
        };
        modifiedEvent = new PlayerEditedEvent(modifiedPlayer);
        break;

      default:
        console.log(`Invalid mode: ${this.mode}`);
        return;
    }

    // The event will be handled by lineup-roster.
    this.dispatchEvent(modifiedEvent);
    // Reset the input fields, so they will be initialized correctly if the
    // instance is reused.
    //  - After the event, primarily to allow tests to inspect fields.
    this.updateInitialValues();
  }

  private cancelModify(/*e: CustomEvent*/) {
    let cancelEvent: PlayerModifyCancelledEvent;
    switch (this.mode) {
      case ModifyMode.Create:
        cancelEvent = new PlayerCreateCancelledEvent();
        break;

      case ModifyMode.Edit:
        cancelEvent = new PlayerEditCancelledEvent();
        break;

      default:
        console.log(`Invalid mode: ${this.mode}`);
        return;
    }
    // The event will be handled by lineup-roster.
    this.dispatchEvent(cancelEvent);
    // Reset the input fields, so they will be initialized correctly if the
    // instance is reused.
    //  - After the event, primarily to allow tests to inspect fields.
    this.updateInitialValues();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lineup-roster-modify": LineupRosterModify;
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
