/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';

import { FormationBuilder } from '../models/formation';
import { LivePlayer, LiveGame } from '../models/game';

// This element is connected to the Redux store.
import { connectStore } from '../middleware/connect-mixin';
import { RootState, RootStore, SliceStoreConfigurator } from '../store';

// The specific store configurator, which handles initialization/lazy-loading.
import { getLiveStore } from '../slices/live-store';

// These are the actions needed by this element.
import { selectPlayer } from '../actions/live';

// These are the elements needed by this element.
import '@material/mwc-button';
import '@material/mwc-icon';
// import { peopleIcon, scheduleIcon } from './lineup-icons';
import './lineup-on-player-list';
import './lineup-player-list';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

@customElement('lineup-game-live')
export class LineupGameLive extends connectStore()(LitElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
      ${this._game ? html`
        ${this._renderGame(this._game, this._players!)}
      ` : html`
        <p class="empty-list">
          Live game not set.
        </p>
      `}
      </div>`
  }

  private _renderGame(game: LiveGame, players: LivePlayer[]) {
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
      <div id="live-on">
        <h5>Playing</h5>
        <lineup-on-player-list .formation="${formation}" .players="${players}"
                                ></lineup-on-player-list>
      </div>
      <div id="live-next">
        <h5>Next On</h5>
        <lineup-player-list mode="next" .players="${players}"></lineup-player-list>
      </div>
      <div id="live-off">
        <h5>Subs</h5>
        <lineup-player-list mode="off" .players="${players}"
                            @playerselected="${this._playerSelected}"></lineup-player-list>
      </div>
      <div id="live-out">
        <h5>Unavailable</h5>
        <lineup-player-list mode="out" .players="${players}"></lineup-player-list>
      </div>`
  }

  @property({ type: Object })
  store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getLiveStore;

  @property({ type: Object })
  private _game: LiveGame | undefined;

  @property({type: Object})
  private _players: LivePlayer[] | undefined;

  stateChanged(state: RootState) {
    if (!state.live) {
      return;
    }
    this._game = state.live!.liveGame;
    if (!this._game) {
      return;
    }

    this._players = this._game.players || [];
  }

  private _playerSelected(e: CustomEvent) {
    this.dispatch(selectPlayer(e.detail.player.id));
  }
}
