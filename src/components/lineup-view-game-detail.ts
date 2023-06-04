/** @format */

import '@material/mwc-button';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { updateMetadata } from 'pwa-helpers/metadata.js';
import { ConnectStoreMixin } from '../middleware/connect-mixin.js';
import { GameDetail, GameStatus } from '../models/game.js';
import { getGameStore } from '../slices/game-store.js';
import { getGame, selectGameById } from '../slices/game/game-slice.js';
import { RootState, RootStore, SliceStoreConfigurator } from '../store.js';
import './lineup-game-complete.js';
import './lineup-game-live.js';
import './lineup-game-setup.js';
import { AuthorizedViewElement } from './page-view-element.js';
import { SharedStyles } from './shared-styles.js';
import { SignedInAuthController } from './util/auth-controller.js';

@customElement('lineup-view-game-detail')
export class LineupViewGameDetail extends ConnectStoreMixin(AuthorizedViewElement) {
  private renderDetailContent(game: GameDetail) {
    if (game.status === GameStatus.Done) {
      // Completed game
      return html`<lineup-game-complete .gameId="${game.id}"></lineup-game-complete>`;
    }

    // const inProgress = (game.status === GameStatus.Live || game.status === GameStatus.Break);
    const isNew = game.status === GameStatus.New;

    if (isNew) {
      return html`<lineup-game-setup .gameId="${game.id}"></lineup-game-setup>`;
    }
    return html`<lineup-game-live .gameId="${game.id}"></lineup-game-live>`;
  }

  override renderView() {
    if (this.game) {
      updateMetadata({
        title: `Game - ${this._getName()}`,
        description: `Game details for: ${this._getName()}`,
      });
    }

    return html`
      ${SharedStyles}
      <section>
        ${this.game
          ? html`
              <h2 main-title>Live: ${this._getName()}</h2>
              ${this.renderDetailContent(this.game)}
            `
          : html` <p class="empty-list">Game not found.</p> `}
      </section>
    `;
  }

  @property({ type: Object })
  override store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getGameStore;

  @property({ type: String })
  gameId?: string;

  @state()
  private game?: GameDetail;

  private gameLoaded = false;

  constructor() {
    super();
    this.registerController(new SignedInAuthController(this));
  }

  override stateChanged(state: RootState) {
    if (!this.gameId || !this.authorized) {
      return;
    }
    this.game = selectGameById(state, this.gameId);
    this.gameLoaded = !!this.game?.hasDetail;
  }

  // AuthorizedView overrides
  protected override keyPropertyName = 'gameId';

  protected override loadData() {
    if (this.gameId) {
      this.dispatch(getGame(this.gameId));
    }
  }

  protected override resetDataProperties() {
    this.gameLoaded = false;
    this.game = undefined;
  }

  protected override isDataReady() {
    return this.gameLoaded;
  }

  protected override getAuthorizedDescription() {
    return 'view game';
  }

  // Formatting functions
  private _getName() {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const game = this.game!;
    return `${game.opponent} ${monthNames[game.date.getMonth()]} ${game.date.getDate()}`;
  }
}
