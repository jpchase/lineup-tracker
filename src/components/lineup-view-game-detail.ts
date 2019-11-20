/**
@license
*/

import { html, customElement, property } from 'lit-element';
import { PageViewElement } from './page-view-element';
import { updateMetadata } from 'pwa-helpers/metadata.js';

import { FormationBuilder } from '../models/formation';
import { GameDetail, GameStatus, LivePlayer } from '../models/game';

// This element is connected to the Redux store.
import { connectStore } from '../middleware/connect-mixin';
import { RootState, RootStore, SliceStoreConfigurator } from '../store';

// The game-specific store configurator, which handles initialization/lazy-loading.
import { getGameStore } from '../slices/game-store';

// These are the actions needed by this element.
import { getGame } from '../actions/game';

// These are the elements needed by this element.
import '@material/mwc-button';
import './lineup-game-setup';
import './lineup-on-player-list';
import './lineup-player-list';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

@customElement('lineup-view-game-detail')
export class LineupViewGameDetail extends connectStore()(PageViewElement) {
  private _getDetailContent(game: GameDetail, players: LivePlayer[]) {
    if (game.status === GameStatus.Done) {
      // Completed game
      return html`Game is done`;
    }

    // const inProgress = (game.status === GameStatus.Live || game.status === GameStatus.Break);
    const isNew = (game.status === GameStatus.New);
    const setupRequired = isNew;

    // TODO: Turn this into a property, rather than creating new each time?
    // Is it causing unnecessary updates?
    let formation = undefined;
    if (game.formation) {
      formation = FormationBuilder.create(game.formation.type);
    }

    return html`
      <div toolbar>
        <span id="gameTimer">clock here</span>
      </div>
      ${setupRequired
        ? html`<lineup-game-setup></lineup-game-setup>`
        : ''
      }
      <div>
        <div id="live-on">
          <h5>Playing</h5>
          <lineup-on-player-list .formation="${formation}" .players="${players}"></lineup-on-player-list>
        </div>
        <div id="live-next" ?hidden=${setupRequired}>
          <h5>Next On</h5>
          <lineup-player-list mode="next" .players="${players}"></lineup-player-list>
        </div>
        <div id="live-off">
          <h5>Subs</h5>
          <lineup-player-list mode="off" .players="${players}"></lineup-player-list>
        </div>
        <div id="live-out" ?hidden=${setupRequired}>
          <h5>Unavailable</h5>
          <lineup-player-list mode="out" .players="${players}"></lineup-player-list>
        </div>
      </div>
    `;
  }

  protected render() {
    if (this._game) {
      updateMetadata({
        title: `Game - ${this._getName()}`,
        description: `Game details for: ${this._getName()}`
      });
    }

    return html`
      ${SharedStyles}
      <section>
      ${this._game ? html`
        <div main-title>Live: ${this._getName()}</div>
        ${this._getDetailContent(this._game, this._players || [])}
      ` : html`
        <p class="empty-list">
          Game not found.
        </p>
      `}
      </section>
    `;
  }

  @property({ type: Object })
  store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getGameStore;

  @property({ type: Object })
  private _game: GameDetail | undefined;

  @property({type: Object})
  private _players: LivePlayer[] | undefined;

  stateChanged(state: RootState) {
    if (!state.game) {
        return;
    }
    const gameState = state.game!;
    this._game = gameState.game;
    this._players = this._game && this._game.liveDetail && this._game.liveDetail.players;
  }

  private _getName() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const game = this._game!;
    return game.opponent + ' ' + monthNames[game.date.getMonth()] + ' ' +
      game.date.getDate();
  }
}

// Expose action for use in loading view.
export { getGame };
