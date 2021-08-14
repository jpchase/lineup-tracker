/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-formfield';
import { customElement, html, internalProperty, LitElement, property } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
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
    // Initialize the field values on first render only, if necessary.
    const initializeFields = this.initializeValues;
    this.initializeValues = false;
    let playerName = '';
    let playerNumber: Number | undefined = undefined;

    if (initializeFields && this.mode === ModifyMode.Edit && this.player) {
      playerName = this.player.name;
      playerNumber = this.player.uniformNumber;
    }

    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
        <h2>${this.renderHeader()}</h2>
        <mwc-formfield id="nameField" alignend label="Name">
            <input type="text" required minlength="2" value="${ifDefined(playerName)}">
        </mwc-formfield>
        <mwc-formfield id="uniformNumberField" alignend label="Uniform Number">
            <input type="number" required min="1" max="99"  value="${ifDefined(playerNumber)}">
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

  @internalProperty()
  private initializeValues = true;

  private mode_?: ModifyMode;
  private player_?: Player;

  private updateInitialValues() {
    if (this.initializeValues) {
      return;
    }
    this.initializeValues = true;
  }

  // TODO: Change to using mwc-textfield instead (it handles all the input complexities)
  private _getFormInput(fieldId: string): HTMLInputElement {
    return this.shadowRoot!.querySelector(`#${fieldId} > input`) as HTMLInputElement;
  }

  private savePlayer(e: CustomEvent) {
    console.log(`savePlayer[${this.mode}]: ${JSON.stringify(e.detail)}`);

    const nameField = this._getFormInput('nameField');
    const uniformNumberField = this._getFormInput('uniformNumberField');

    // TODO: Validation
    const nameValue = nameField.value!.trim();
    const uniformNumberValue = Number(uniformNumberField.value!.trim());

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

    // This event will be handled by lineup-roster.
    this.dispatchEvent(modifiedEvent);
  }

  private cancelModify(/*e: CustomEvent*/) {
    // This event will be handled by lineup-roster.
    this.dispatchEvent(new PlayerCreateCancelledEvent());
  }
}
