import '@material/mwc-button';
import '@material/mwc-circular-progress';
import { html, LitElement, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { updateMetadata } from 'pwa-helpers/metadata.js';
import { connectStore } from '../middleware/connect-mixin';
import { GameDetail, GameStatus } from '../models/game.js';
import { Roster } from '../models/player.js';
import { getGameStore } from '../slices/game-store.js';
import { addNewGamePlayer, copyRoster, getGame, selectGameById, selectGameRosterLoading } from '../slices/game/game-slice.js';
import { RootState, RootStore, SliceStoreConfigurator } from '../store.js';
import './lineup-roster.js';
import { PageViewMixin } from './page-view-element.js';
import { SharedStyles } from './shared-styles.js';

// Expose action for use in loading view.
export { getGame } from '../slices/game/game-slice.js';

// This element is connected to the Redux store.
@customElement('lineup-view-game-roster')
export class LineupViewGameRoster extends connectStore()(PageViewMixin(LitElement)) {
  // TODO: Extract common logic (duplicated from LineupViewGameDetail)
  override render() {
    let gameExists = false;
    let rosterExists = false;
    let isNewStatus = false;

    if (this.game) {
      gameExists = true;
      isNewStatus = this.game.status === GameStatus.New;
      rosterExists = (Object.keys(this._roster).length > 0);

      updateMetadata({
        title: `Game Roster - ${this._getName()}`,
        description: `Game roster for: ${this._getName()}`
      });
    }

    return html`
      ${SharedStyles}
      <section>
      ${gameExists ? html`
        <h2>Roster: ${this._getName()}</h2>
        ${rosterExists ? html`
          <lineup-roster .roster="${this._roster}"
                         .addPlayerEnabled="${isNewStatus}"
                         @newplayercreated="${this.newPlayerCreated}"></lineup-roster>
        ` : html`
          <div class="empty-list">
            <div>Roster is empty.</div>
            <mwc-button id='copy-button' icon="file_copy" ?disabled="${this._copyingInProgress}"
                        @click="${this._copyTeamRoster}">Copy From Team</mwc-button>
            ${this.renderCopyingInProgress()}
          </div>
        `}
      ` : html`
        <p class="empty-list">
          Game not found.
        </p>
      `}
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

  @property({ type: Object })
  override store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getGameStore;

  @property({ type: String })
  gameId?: string;

  @state()
  private game?: GameDetail;

  @state()
  private _roster: Roster = {};

  @state()
  private _copyingInProgress = false;

  private gameLoaded = false;

  override stateChanged(state: RootState) {
    if (!this.gameId) {
      return;
    }
    this.game = selectGameById(state, this.gameId);
    this.gameLoaded = !!this.game?.hasDetail;
    this._roster = this.game?.roster || {};
    this._copyingInProgress = !!selectGameRosterLoading(state);
  }

  override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (changedProperties.has('gameId')) {
      this.resetData();
      if (this.gameId) {
        this.dispatch(getGame(this.gameId));
      }
      return;
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

  private _copyTeamRoster(e: Event) {
    if (e.target) { (e.target as HTMLInputElement).disabled = true; }
    this.ready = false;
    this.dispatch(copyRoster(this.gameId!));
  }

  private newPlayerCreated(e: CustomEvent) {
    this.dispatch(addNewGamePlayer(e.detail.player));
  }

  // TODO: Extract common function (duplicated from LineupViewGameDetail)
  private _getName() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const game = this.game!;
    return game.opponent + ' ' + monthNames[game.date.getMonth()] + ' ' +
      game.date.getDate();
  }

}
