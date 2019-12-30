/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { ifDefined } from 'lit-html/directives/if-defined';

import { FormationBuilder } from '../models/formation';
import { GameDetail, LivePlayer, SetupStatus, SetupSteps, SetupTask } from '../models/game';

// This element is connected to the Redux store.
import { connectStore } from '../middleware/connect-mixin';
import { RootState, RootStore, SliceStoreConfigurator } from '../store';

// The specific store configurator, which handles initialization/lazy-loading.
import { getGameStore } from '../slices/game-store';
import { getLiveStore } from '../slices/live-store';

// These are the actions needed by this element.
import { navigate } from '../actions/app';
import {
  markCaptainsDone,
  markRosterDone,
  markStartersDone,
  setFormation,
  startGame
} from '../actions/game';
import {
  applyProposedStarter,
  cancelProposedStarter,
  selectStarter,
  selectStarterPosition
} from '../actions/live';

// These are the elements needed by this element.
import '@material/mwc-button';
import '@material/mwc-icon';
// import { peopleIcon, scheduleIcon } from './lineup-icons';
import './lineup-on-player-list';
import './lineup-player-list';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

function getStepName(step: SetupSteps): string {
  switch (step) {
    case SetupSteps.Formation:
      return 'Set formation';

    case SetupSteps.Roster:
      return 'Set game roster';

    case SetupSteps.Captains:
      return 'Set captains';

    case SetupSteps.Starters:
      return 'Setup the starting lineup';

    default:
      return '<unknown step>';
  }
}

function isAutoStep(step: SetupSteps): boolean {
  switch (step) {
    case SetupSteps.Formation:
      return true;

    default:
      return false;
  }
}

@customElement('lineup-game-setup')
export class LineupGameSetup extends connectStore()(LitElement) {
  protected render() {
    const tasks = this._tasks;
    const players = this._players;

    // TODO: Turn this into a property, rather than creating new each time?
    // Is it causing unnecessary updates?
    let formation = undefined;
    if (this._game && this._game.formation) {
      formation = FormationBuilder.create(this._game.formation.type);
    }

    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }

        a.step:not([href]) {
          color: currentColor;
          cursor: not-allowed;
          text-decoration: none;
        }

        a.step:link, a.step:hover, a.step:visited {
          /* Enabled link styles */
          color: currentColor;
        }

        div.formation {
          display: none;
        }

        div.formation[active] {
          display: block;
        }

        .status mwc-icon[done] {
          color: green;
        }
      </style>
      <div>
      ${this._game ? html`
        ${repeat(tasks, (task: SetupTask) => task.step, (task: SetupTask) => html`
          <div class="task flex-equal-justified step${task.step}">
            <div class="name">
              <a class="step" href="${ifDefined(this._getStepHref(task))}"
                 @click="${ (e: Event) => this._performStep(e, task)}">${getStepName(task.step)}</a>
            </div>
            <div class="status">
            ${task.status === SetupStatus.InProgress
              ? html`spinner here`
              : task.status === SetupStatus.Complete
                ? html`<mwc-icon done>done</mwc-icon>`
                : (task.status === SetupStatus.Pending || isAutoStep(task.step))
                  ? html`<mwc-icon>more_horiz</mwc-icon>`
                  : html`<mwc-button class="finish" icon="check"
                             @click="${(e: Event) => this._finishStep(e, task.step)}">Done</mwc-button>`
            }
            </div>
          </div>
        `)}
        <div class="start flex-equal-justified">
          <mwc-button icon="play_arrow"
                      ?disabled="${!this._tasksComplete}"
                      @click="${this._startGame}">Start game</mwc-button>
        </div>
        <div class="formation" ?active="${this._showFormation}">
          <select
            @change="${this._onFormationChange}"
            value="">
            <option value="">Not set</option>
            <option value="4-3-3">4-3-3</option>
          </select>
        </div>
        <div id="live-on">
          <h5>Starters</h5>
          <lineup-on-player-list .formation="${formation}" .players="${players}"
                                 @positionselected="${this._positionSelected}"></lineup-on-player-list>
        </div>
        <div id="confirm-starter">
        ${this._getConfirmStarter()}
        </div>
        <div id="live-off">
          <h5>Subs</h5>
          <lineup-player-list mode="off" .players="${players}"
                              @playerselected="${this._playerSelected}"></lineup-player-list>
        </div>
      ` : html`
        <p class="empty-list">
          Cannot setup - Game not set.
        </p>
      `}
      </div>`
  }

  private _getConfirmStarter() {
    if (!this._proposedStarter) {
      return '';
    }
    const starter = this._proposedStarter;
    const currentPosition = starter.currentPosition!;
    let positionText = currentPosition.type;

    if (currentPosition.id !== currentPosition.type) {
      let addition = '';
      if (currentPosition.id[0] === 'L') {
        addition = 'Left';
      } else if (currentPosition.id[0] === 'R') {
        addition = 'Right';
      } else if (currentPosition.id.length > currentPosition.type.length) {
        addition = currentPosition.id.substring(currentPosition.type.length);
      }
      positionText += ` (${addition})`;
    }

    return html`
      <div>
        <h5>Confirm starter?</h5>
        <span class="proposed-player">${starter.name} #${starter.uniformNumber}</span>
        <span class="proposed-position">${positionText}</span>
        <mwc-button class="cancel" @click="${this._cancelStarter}">Cancel</mwc-button>
        <mwc-button class="ok" autofocus @click="${this._applyStarter}">Apply</mwc-button>
      </div>
    `;
  }

  @property({ type: Object })
  store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getLiveStore;

  @property({ type: Object })
  private _game: GameDetail | undefined;

  @property({ type: Object })
  private _tasks: SetupTask[] = [];

  @property({ type: Boolean })
  private _tasksComplete = false;

  @property({ type: Boolean })
  private _showFormation = false;

  @property({type: Object})
  private _players: LivePlayer[] | undefined;

  @property({type: Object})
  private _proposedStarter: LivePlayer | undefined;

  protected firstUpdated() {
    getGameStore(this.store);
  }

  stateChanged(state: RootState) {
    if (!state.game || !state.live) {
      return;
    }
    this._game = state.game!.game;
    if (!this._game) {
      return;
    }
    this._tasks = this._game.liveDetail && this._game.liveDetail.setupTasks || [];

    const anyIncomplete = this._tasks.some(task => task.status !== SetupStatus.Complete);
    this._tasksComplete = !anyIncomplete;

    this._players = state.live.liveGame && state.live.liveGame.players || [];
    this._proposedStarter = state.live!.proposedStarter;
  }

  private _getStepHref(task: SetupTask) {
    // Only active steps should have an href.
    if (task.status === SetupStatus.Active) {
      return '#';
    }
    return undefined;
  }

  private _performStep(e: Event, task: SetupTask) {
    // Only do the step if it's currently active.
    if (task.status === SetupStatus.Active) {
      switch (task.step) {
        case SetupSteps.Formation:
          this._showFormation = true;
          break;

        case SetupSteps.Roster:
          window.history.pushState({}, '', `/gameroster/${this._game!.id}`);
          this.dispatch(navigate(window.location));
          break;

        default:
          break;
      }
    }
    e.preventDefault();
    return false;
  }

  private _finishStep(e: Event, step: SetupSteps) {
    switch (step) {
      case SetupSteps.Captains:
        this.dispatch(markCaptainsDone());
        break;

      case SetupSteps.Roster:
        this.dispatch(markRosterDone());
        break;

      case SetupSteps.Starters:
        this.dispatch(markStartersDone());
        break;

      default:
        break;
    }
    e.preventDefault();
    return false;
  }

  private _startGame() {
    this.dispatch(startGame());
  }

  private _onFormationChange(e: Event) {
    const select: HTMLSelectElement = e.target as HTMLSelectElement;

    this.dispatch(setFormation(select.value));

  // TODO: Clear select after setting, otherwise will be pre-filled on other games
    this._showFormation = false;
  }

  private _playerSelected(e: CustomEvent) {
    this.dispatch(selectStarter(e.detail.player.id));
  }

  private _positionSelected(e: CustomEvent) {
    this.dispatch(selectStarterPosition(e.detail.position));
  }

  private _applyStarter() {
    this.dispatch(applyProposedStarter());
  }

  private _cancelStarter() {
    this.dispatch(cancelProposedStarter());
  }

}
