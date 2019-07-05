/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

import { GameDetail } from '../models/game';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store';

// These are the actions needed by this element.
import { setFormation } from '../actions/game';

// import { peopleIcon, scheduleIcon } from './lineup-icons';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

const enum SetupSteps {
  // CopyRoster,
  Formation,
  Roster,
  Captains,
  Starters
}

const enum SetupStatus {
  Pending,
  Active,
  InProgress,
  Complete
}

interface SetupTask {
  step: SetupSteps;
  status: SetupStatus;
}

function getStepName(step: SetupSteps): string {
  switch (step) {
    // case SetupSteps.CopyRoster:
    //   return 'Copy roster from team';

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
    // case SetupSteps.CopyRoster:
    //   return true;

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
                  : html`widget to mark done`
            }
            </div>
          </div>
        `)}
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
    this._tasks = this._buildTasks();
  }

  private _buildTasks(): SetupTask[] {
    const tasks: SetupTask[] = [];

    // Copy formation
    tasks.push({
      step: SetupSteps.Formation,
      status: SetupStatus.Active
    });

    // Adjust roster
    tasks.push({
      step: SetupSteps.Roster,
      status: SetupStatus.Pending
    });

    // Captains
    tasks.push({
      step: SetupSteps.Captains,
      status: SetupStatus.Pending
    });

    // Starting lineup
    tasks.push({
      step: SetupSteps.Starters,
      status: SetupStatus.Pending
    });

    return tasks;
  }

  private _markStepComplete(step: SetupSteps) {
    this._tasks[step].status = SetupStatus.Complete;
    if (step >= this._tasks.length) {
      return;
    }
    this._tasks[step + 1].status = SetupStatus.Active;
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

  private _onFormationChange(e: Event) {
    const select: HTMLSelectElement = e.target as HTMLSelectElement;

    store.dispatch(setFormation(select.value));

    this._markStepComplete(SetupSteps.Formation);
    this._showFormation = false;
  }

}
