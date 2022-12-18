import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { updateMetadata } from 'pwa-helpers/metadata.js';
import { connectStore } from '../middleware/connect-mixin';
import { GameDetail, GameStatus } from '../models/game.js';
import { RootState, RootStore, SliceStoreConfigurator } from '../store';
import { PageViewElement } from './page-view-element.js';
// The game-specific store configurator, which handles initialization/lazy-loading.
import '@material/mwc-button';
import { getGameStore } from '../slices/game-store';
import './lineup-game-live';
import './lineup-game-setup';
import { SharedStyles } from './shared-styles';

// Expose action for use in loading view.
export { getGame } from '../slices/game/game-slice.js';

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

  override render() {
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
  override store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getGameStore;

  @property({ type: Object })
  private _game: GameDetail | undefined;

  override stateChanged(state: RootState) {
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
