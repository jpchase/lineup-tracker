/** @format */

import '@material/mwc-button';
import '@material/mwc-circular-progress';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { updateMetadata } from 'pwa-helpers/metadata.js';
import { RootState } from '../app/store.js';
import { GameDetail, GameStatus } from '../models/game.js';
import { Roster } from '../models/player.js';
import {
  addNewGamePlayer,
  copyRoster,
  getGame,
  getGameSliceConfigurator,
  selectGameById,
  selectGameRosterLoading,
} from '../slices/game/index.js';
import { SignedInAuthController } from './core/auth-controller.js';
import { ConnectStoreMixin } from './core/connect-mixin.js';
import { AuthorizedViewElement } from './core/page-view-element.js';
import './lineup-roster.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-view-game-roster')
export class LineupViewGameRoster extends ConnectStoreMixin(AuthorizedViewElement) {
  // TODO: Extract common logic (duplicated from LineupViewGameDetail)
  override renderView() {
    let gameExists = false;
    let rosterExists = false;
    let isNewStatus = false;

    if (this.game) {
      gameExists = true;
      isNewStatus = this.game.status === GameStatus.New;
      rosterExists = Object.keys(this._roster).length > 0;

      updateMetadata({
        title: `Game Roster - ${this._getName()}`,
        description: `Game roster for: ${this._getName()}`,
      });
    }

    return html`
      ${SharedStyles}
      <section>
        ${gameExists
          ? html`
              <h2>Roster: ${this._getName()}</h2>
              ${rosterExists
                ? html`
                    <lineup-roster
                      .roster="${this._roster}"
                      .addPlayerEnabled="${isNewStatus}"
                      @new-player-created="${this.newPlayerCreated}"
                    >
                    </lineup-roster>
                  `
                : html`
                    <div class="empty-list">
                      <div>Roster is empty.</div>
                      <mwc-button
                        id="copy-button"
                        icon="file_copy"
                        ?disabled="${this._copyingInProgress}"
                        @click="${this._copyTeamRoster}"
                        >Copy From Team</mwc-button
                      >
                      ${this.renderCopyingInProgress()}
                    </div>
                  `}
            `
          : html` <p class="empty-list">Game not found.</p> `}
      </section>
    `;
  }

  private renderCopyingInProgress() {
    if (!this._copyingInProgress) {
      return nothing;
    }

    return html`
      <div>
        <div>Copying from team roster...</div>
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>
    `;
  }

  @property({ type: String })
  gameId?: string;

  @state()
  private game?: GameDetail;

  @state()
  private _roster: Roster = {};

  @state()
  private _copyingInProgress = false;

  private gameLoaded = false;

  constructor() {
    super();
    this.registerSliceConfigurator(getGameSliceConfigurator());
    this.registerController(new SignedInAuthController(this));
  }

  override stateChanged(state: RootState) {
    if (!this.gameId || !this.authorized) {
      return;
    }
    this.game = selectGameById(state, this.gameId);
    this.gameLoaded = !!this.game?.hasDetail;
    this._roster = this.game?.roster || {};
    this._copyingInProgress = !!selectGameRosterLoading(state);
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
    this._roster = {};
    this._copyingInProgress = false;
  }

  protected override isDataReady() {
    return this.gameLoaded && !this._copyingInProgress;
  }

  protected override getAuthorizedDescription() {
    return 'view game roster';
  }

  // Event handlers
  private _copyTeamRoster(e: Event) {
    if (e.target) {
      const button = e.target as HTMLInputElement;
      button.disabled = true;
    }
    this.ready = false;
    this.dispatch(copyRoster(this.gameId!));
  }

  private newPlayerCreated(e: CustomEvent) {
    this.dispatch(addNewGamePlayer(this.gameId!, e.detail.player));
  }

  // Formatting functions
  // TODO: Extract common function (duplicated from LineupViewGameDetail)
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
