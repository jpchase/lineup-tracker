/**
@license
*/

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element';
import { updateMetadata } from 'pwa-helpers/metadata.js';

import { GameDetail, GameStatus } from '../models/game';

// This element is connected to the Redux store.
import { connectStore } from '../middleware/connect-mixin';
import { RootState, RootStore, SliceStoreConfigurator } from '../store';

// The game-specific store configurator, which handles initialization/lazy-loading.
import { getGameStore } from '../slices/game-store';

// These are the actions needed by this element.
import { getGame } from '../actions/game';

// These are the elements needed by this element.
import '@material/mwc-button';
import './lineup-game-live';
import './lineup-game-setup';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

@customElement('lineup-view-game-detail')
export class LineupViewGameDetail extends connectStore()(PageViewElement) {
  private _getDetailContent(game: GameDetail) {
    if (game.status === GameStatus.Done) {
      // Completed game
      return html`Game is done`;
    }

    // const inProgress = (game.status === GameStatus.Live || game.status === GameStatus.Break);
    const isNew = (game.status === GameStatus.New);

    if (isNew) {
      return html`<lineup-game-setup></lineup-game-setup>`;
    }
    return html`<lineup-game-live></lineup-game-live>`;
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
        <h2 main-title>Live: ${this._getName()}</h2>
        ${this._getDetailContent(this._game)}
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

  stateChanged(state: RootState) {
    if (!state.game) {
      return;
    }
    const gameState = state.game!;
    this._game = gameState.game;
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
