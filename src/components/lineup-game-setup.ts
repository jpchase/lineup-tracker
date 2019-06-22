/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

import { GameDetail } from '../models/game';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store';

// import { peopleIcon, scheduleIcon } from './lineup-icons';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

const enum SetupSteps {
  CopyRoster,
  CopyFormation,
  AdjustRoster,
  Captains,
  Starters
}

interface SetupTask {
  step: SetupSteps;
  pending: boolean;
  inProgress: boolean;
  complete: boolean;
}

function getStepName(step: SetupSteps): string {
  switch (step) {
    case SetupSteps.CopyRoster:
      return 'Copy roster from team';

    case SetupSteps.CopyFormation:
      return 'Set formation';

    case SetupSteps.AdjustRoster:
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
    case SetupSteps.CopyRoster:
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
      </style>
      <div>
        ${repeat(tasks, (task: SetupTask) => task.step, (task: SetupTask) => html`
          <div class="task flex-equal-justified">
            <div class="name">${getStepName(task.step)}</div>
            <div class="status">
            ${task.inProgress
              ? html`spinner here`
              : task.complete
                ? html`done icon here`
                : (task.pending || isAutoStep(task.step))
                  ? html`pending icon/text here`
                  : html`widget to mark done`
            }
            </div>
          </div>
        `)}
      </div>`
  }

  @property({ type: Object })
  private _game: GameDetail | undefined;

  @property({ type: Object })
  private _tasks: SetupTask[] = this._initTasks();

  protected firstUpdated() {
  }

  stateChanged(state: RootState) {
    if (!state.game) {
      return;
    }
    this._game = state.game!.game;
    if (!this._game) {
      return;
    }
  }

  _initTasks(): SetupTask[] {
    const tasks: SetupTask[] = [];

    // Copy formation
    tasks.push({
      step: SetupSteps.CopyFormation,
      inProgress: false,
      complete: false,
      pending: false
    });

    // Adjust roster
    tasks.push({
      step: SetupSteps.AdjustRoster,
      inProgress: false,
      complete: false,
      pending: !tasks[tasks.length - 1].complete
    });

    // Captains
    tasks.push({
      step: SetupSteps.Captains,
      inProgress: false,
      complete: false,
      pending: !tasks[tasks.length - 1].complete
    });

    // Starting lineup
    tasks.push({
      step: SetupSteps.Starters,
      inProgress: false,
      complete: false,
      pending: !tasks[tasks.length - 1].complete
    });

    return tasks;
  }

}
