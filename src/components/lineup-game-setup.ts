/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

import { GameDetail, SetupStatus, SetupSteps, SetupTask } from '../models/game';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store';

// These are the actions needed by this element.
import { markCaptainsDone, markRosterDone, markStartersDone, setFormation } from '../actions/game';

// These are the elements needed by this element.
import '@material/mwc-button';
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

        div.formation {
          display: none;
        }

        div.formation[active] {
          display: block;
        }
      </style>
      <div>
        ${repeat(tasks, (task: SetupTask) => task.step, (task: SetupTask) => html`
          <div class="task flex-equal-justified">
            <div class="name">
              <a href="#"
                 @click="${ (e: Event) => this._doStep(e, task.step)}">${getStepName(task.step)}</a>
            </div>
            <div class="status">
            ${task.status === SetupStatus.InProgress
              ? html`spinner here`
              : task.status === SetupStatus.Complete
                ? html`done icon here`
                : (task.status === SetupStatus.Pending || isAutoStep(task.step))
                  ? html`pending icon/text here`
                  : html`<mwc-button icon="check"
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
            <option value="F4_3_3">4-3-3</option>
          </select>
        </div>
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
    this._tasks = this._game.setupTasks || [];

    const anyIncomplete = this._tasks.some(task => task.status !== SetupStatus.Complete);
    this._tasksComplete = !anyIncomplete;
  }

  private _doStep(e: Event, step: SetupSteps) {
    switch (step) {
      case SetupSteps.Formation:
        this._showFormation = true;
        break;

      default:
        break;
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
    console.log('Start that game!');
  }

  private _onFormationChange(e: Event) {
    const select: HTMLSelectElement = e.target as HTMLSelectElement;

    store.dispatch(setFormation(select.value));

    this._showFormation = false;
  }

}
