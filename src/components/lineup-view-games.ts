import '@material/mwc-fab';
import { html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { debug } from '../common/debug.js';
import { connectStore } from '../middleware/connect-mixin.js';
import { Games } from '../models/game.js';
import { selectCurrentTeam } from '../slices/app/app-slice.js';
import { getGameStore } from '../slices/game-store.js';
import { addNewGame, getGames } from '../slices/game/game-slice.js';
import { RootState, RootStore, SliceStoreConfigurator } from '../store.js';
import './lineup-game-create.js';
import './lineup-game-list.js';
import { PageViewElement } from './page-view-element.js';
import { SharedStyles } from './shared-styles.js';

const debugGames = debug('view-games');

// This element is connected to the Redux store.
@customElement('lineup-view-games')
export class LineupViewGames extends connectStore()(PageViewElement) {
  override render() {
    return html`
      ${SharedStyles}
      <style>
        mwc-fab {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          bottom: 30px;
        }

        lineup-game-create {
          display: none;
        }

        lineup-game-create[active] {
          display: block;
        }
      </style>
      <section>
        <lineup-game-list .games="${this._games}"></lineup-game-list>
        <mwc-fab icon="add" label="Add Game" @click="${this._addButtonClicked}"></mwc-fab>
        <lineup-game-create ?active="${this._showCreate}"
            @newgamecreated="${this._newGameCreated}"
            @newgamecancelled="${this._newGameCancelled}"></lineup-game-create>
      </section>
    `;
  }

  @property({ type: Object })
  override store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getGameStore;

  @state()
  private teamId?: string;

  @state()
  private _showCreate = false;

  @state()
  private _games: Games = {};

  @property({ type: Boolean, reflect: true })
  ready = false;

  private gamesLoaded = false;

  private _addButtonClicked() {
    this._showCreate = true;
  }

  private _newGameCreated(e: CustomEvent) {
    debugGames(`New game: ${JSON.stringify(e.detail.game)}`);
    this.dispatch(addNewGame(e.detail.game));
    this._showCreate = false;
  }

  private _newGameCancelled() {
    this._showCreate = false;
  }

  // This is called every time something is updated in the store.
  override stateChanged(state: RootState) {
    const currentTeam = selectCurrentTeam(state);
    if (!currentTeam || !state.game) {
      if (this.ready) {
        this.resetData();
      }
      return;
    }
    if (this.teamId !== currentTeam.id) {
      this.resetData();
      this.teamId = currentTeam.id;
      this.dispatch(getGames(this.teamId));
      return;
    }
    this._games = state.game.games;
    this.gamesLoaded = (Object.keys(this._games).length > 0);
  }

  override willUpdate(_changedProperties: PropertyValues<this>) {
    if (!this.ready && this.gamesLoaded) {
      this.ready = true;
    }
  }

  private resetData() {
    this.ready = false;
    this.gamesLoaded = false;
    this.teamId = undefined;
    this._games = {};
  }
}
