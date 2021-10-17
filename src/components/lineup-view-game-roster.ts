/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-circular-progress';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { updateMetadata } from 'pwa-helpers/metadata.js';
import { addNewGamePlayer, copyRoster, getGame } from '../actions/game';
import { connectStore } from '../middleware/connect-mixin';
import { GameDetail, GameStatus } from '../models/game';
import { Roster } from '../models/player';
import { getGameStore } from '../slices/game-store';
import { RootState, RootStore, SliceStoreConfigurator } from '../store';
import './lineup-roster';
import { PageViewElement } from './page-view-element';
import { SharedStyles } from './shared-styles';

// Expose action for use in loading view.
export { getGame };

// This element is connected to the Redux store.
@customElement('lineup-view-game-roster')
export class LineupViewGameRoster extends connectStore()(PageViewElement) {
  // TODO: Extract common logic (duplicated from LineupViewGameDetail)
  protected render() {
    const gameExists = !!this._game;
    let rosterExists = false;
    let isNewStatus = false;

    if (gameExists) {
      isNewStatus = this._game!.status === GameStatus.New;
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
            <mwc-button icon="file_copy" ?disabled="${this._copyingInProgress}"
                             @click="${this._copyTeamRoster}">Copy From Team</mwc-button>
            ${this._getLoadingContent()}
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

  private _getLoadingContent() {
    if (!this._copyingInProgress) {
      return '';
    }

    return html`
      <div>
        <div>Copying from team roster...</div>
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>
    `;
  }

  @property({ type: Object })
  store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getGameStore;

  @state()
  private _game: GameDetail | undefined;

  @state()
  private _roster: Roster = {};

  @state()
  private _copyingInProgress = false;

  stateChanged(state: RootState) {
    if (!state.game) {
      return;
    }
    const gameState = state.game!;
    this._game = gameState.game;
    this._roster = gameState.game && gameState.game.roster || {};
    this._copyingInProgress = gameState.rosterLoading;
  }

  private _copyTeamRoster(e: Event) {
    if (e.target) { (e.target as HTMLInputElement).disabled = true; }
    this.dispatch(copyRoster(this._game!.id));
  }

  private newPlayerCreated(e: CustomEvent) {
    this.dispatch(addNewGamePlayer(e.detail.player));
  }

  // TODO: Extract common function (duplicated from LineupViewGameDetail)
  private _getName() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const game = this._game!;
    return game.opponent + ' ' + monthNames[game.date.getMonth()] + ' ' +
      game.date.getDate();
  }

}
