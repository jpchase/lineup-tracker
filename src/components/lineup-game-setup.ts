/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { ifDefined } from 'lit-html/directives/if-defined';

import { GameDetail, SetupStatus, SetupSteps, SetupTask } from '../models/game';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store';

// These are the actions needed by this element.
import { navigate } from '../actions/app';
import {
  markCaptainsDone,
  markRosterDone,
  markStartersDone,
  setFormation,
  startGame
} from '../actions/game';

// These are the elements needed by this element.
import '@material/mwc-button';
import '@material/mwc-icon';
// import { peopleIcon, scheduleIcon } from './lineup-icons';

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
export class LineupGameSetup extends connect(store)(LitElement) {
  protected render() {
    const tasks = this._tasks;
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
                 @click="${ (e: Event) => this._doStep(e, task)}">${getStepName(task.step)}</a>
            </div>
            <div class="status">
            ${task.status === SetupStatus.InProgress
              ? html`spinner here`
              : task.status === SetupStatus.Complete
                ? html`<mwc-icon done>done</mwc-icon>`
                : (task.status === SetupStatus.Pending || isAutoStep(task.step))
                  ? html`<mwc-icon>more_horiz</mwc-icon>`
                  : html`<mwc-button class="finish" icon="check"
                             @click="${(e: Event) => this._stepDone(e, task.step)}">Done</mwc-button>`
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
      ` : html`
        <p class="empty-list">
          Cannot setup - Game not set.
        </p>
      `}
      </div>`
  }

  @property({ type: Object })
  private _game: GameDetail | undefined;

  @property({ type: Object })
  private _tasks: SetupTask[] = [];

  @property({ type: Boolean })
  private _tasksComplete = false;

  @property({ type: Boolean })
  private _showFormation = false;

  protected firstUpdated() {
  }

  stateChanged(state: RootState) {
    const hasGS = !!state.game;
    const hasGame = hasGS ? !!state.game!.game : false;
    console.log(`l-g-s: stateChanged - hasGS = ${hasGS}, hasGame = ${hasGame}`);
    if (!state.game) {
      return;
    }
    this._game = state.game!.game;
    if (!this._game) {
      return;
    }
    this._tasks = this._game.liveDetail && this._game.liveDetail.setupTasks || [];

    const anyIncomplete = this._tasks.some(task => task.status !== SetupStatus.Complete);
    this._tasksComplete = !anyIncomplete;
  }

  private _getStepHref(task: SetupTask) {
    // Only active steps should have an href.
    if (task.status === SetupStatus.Active) {
      return '#';
    }
    return undefined;
  }

  private _doStep(e: Event, task: SetupTask) {
    // Only do the step if it's currently active.
    if (task.status === SetupStatus.Active) {
      switch (task.step) {
        case SetupSteps.Formation:
          this._showFormation = true;
          break;

        case SetupSteps.Roster:
          window.history.pushState({}, '', `/gameroster/${this._game!.id}`);
          store.dispatch(navigate(window.location));
          break;

        default:
          break;
      }
    }
    e.preventDefault();
    return false;
  }

  private _stepDone(e: Event, step: SetupSteps) {
    switch (step) {
      case SetupSteps.Captains:
        store.dispatch(markCaptainsDone());
        break;

      case SetupSteps.Roster:
        store.dispatch(markRosterDone());
        break;

      case SetupSteps.Starters:
        store.dispatch(markStartersDone());
        break;

      default:
        break;
    }
    e.preventDefault();
    return false;
  }

  private _startGame() {
    store.dispatch(startGame());
  }

  private _onFormationChange(e: Event) {
    const select: HTMLSelectElement = e.target as HTMLSelectElement;

    store.dispatch(setFormation(select.value));

  // TODO: Clear select after setting, otherwise will be pre-filled on other games
    this._showFormation = false;
  }

}
