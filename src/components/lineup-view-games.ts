/** @format */

import '@material/mwc-fab';
import { html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { RootState } from '../app/store.js';
import { Game, Games } from '../models/game.js';
import { selectCurrentTeam } from '../slices/app/index.js';
import { addNewGame, getGameSliceConfigurator, getGames } from '../slices/game/index.js';
import { logger } from '../util/logger.js';
import { SignedInAuthController } from './core/auth-controller.js';
import { ConnectStoreMixin } from './core/connect-mixin.js';
import { AuthorizedViewElement } from './core/page-view-element.js';
import './lineup-game-create.js';
import { GameCreatedEvent, LineupGameCreate } from './lineup-game-create.js';
import './lineup-game-list.js';
import { SharedStyles } from './shared-styles.js';

const debugGames = logger('view-games');

@customElement('lineup-view-games')
export class LineupViewGames extends ConnectStoreMixin(AuthorizedViewElement) {
  override renderView() {
    return html`
      ${SharedStyles}
      <style>
        mwc-fab {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          bottom: 30px;
        }
      </style>
      <section>
        <lineup-game-list .games="${this._games}"></lineup-game-list>
        <mwc-fab id="add-button" icon="add" label="Add Game" @click="${this.addNewGame}"></mwc-fab>
        <lineup-game-create @game-created="${this.newGameCreated}"></lineup-game-create>
      </section>
    `;
  }

  @query('lineup-game-create')
  protected createElement?: LineupGameCreate;

  @state()
  private teamId?: string;

  @state()
  private _games: Games = {};

  private gamesLoaded = false;

  constructor() {
    super();
    this.registerSliceConfigurator(getGameSliceConfigurator());
    this.registerController(new SignedInAuthController(this));
  }

  private addNewGame() {
    this.createElement?.show();
  }

  private newGameCreated(e: GameCreatedEvent) {
    debugGames(`New game: ${JSON.stringify(e.detail.game)}`);
    // TODO: Change action to take a GameMetadata
    this.dispatch(addNewGame(e.detail.game as Game));
  }

  // This is called every time something is updated in the store.
  override stateChanged(state: RootState) {
    if (!this.authorized) {
      return;
    }
    const currentTeam = selectCurrentTeam(state);
    this.teamId = currentTeam?.id;
    if (!currentTeam || !state.game) {
      return;
    }
    this._games = state.game.games;
    this.gamesLoaded = Object.keys(this._games).length > 0;
  }

  // AuthorizedView overrides
  protected override keyPropertyName = 'teamId';

  protected override loadData() {
    if (this.teamId) {
      this.dispatch(getGames(this.teamId));
    }
  }

  protected override resetDataProperties() {
    this.gamesLoaded = false;
    this._games = {};
  }

  protected override isDataReady() {
    return this.gamesLoaded;
  }

  protected override getAuthorizedDescription() {
    return 'view games';
  }
}
