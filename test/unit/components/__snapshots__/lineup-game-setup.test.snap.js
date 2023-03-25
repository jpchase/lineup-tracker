/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-game-setup tests starts empty"] = 
`<div>
  <p class="empty-list">
    Cannot setup - Game not set.
  </p>
</div>
`;
/* end snapshot lineup-game-setup tests starts empty */

snapshots["lineup-game-setup tests renders all the tasks"] = 
`<div>
  <div class="flex-equal-justified step0 task">
    <div class="name">
      <a
        class="step"
        href="#"
      >
        Roster
      </a>
    </div>
    <div class="status">
      <mwc-button
        class="finish"
        icon="check"
      >
        Done
      </mwc-button>
    </div>
  </div>
  <div class="flex-equal-justified step1 task">
    <div class="name">
      <a class="step">
        Formation
      </a>
    </div>
    <div class="status">
      <mwc-icon>
        more_horiz
      </mwc-icon>
    </div>
  </div>
  <div class="flex-equal-justified step2 task">
    <div class="name">
      <a class="step">
        Starting lineup
      </a>
    </div>
    <div class="status">
      <mwc-icon>
        more_horiz
      </mwc-icon>
    </div>
  </div>
  <div class="flex-equal-justified step3 task">
    <div class="name">
      <a class="step">
        Periods and duration
      </a>
    </div>
    <div class="status">
      <mwc-icon>
        more_horiz
      </mwc-icon>
    </div>
  </div>
  <div class="flex-equal-justified step4 task">
    <div class="name">
      <a class="step">
        Captains
      </a>
    </div>
    <div class="status">
      <mwc-icon>
        more_horiz
      </mwc-icon>
    </div>
  </div>
  <div class="flex-equal-justified">
    <mwc-button
      disabled=""
      icon="done_all"
      id="complete-button"
    >
      Complete Setup
    </mwc-button>
  </div>
  <div class="formation">
    <select value="">
      <option value="">
        Not set
      </option>
      <option value="4-3-3">
        4-3-3
      </option>
      <option value="3-1-4-2">
        3-1-4-2
      </option>
    </select>
  </div>
  <div id="live-on">
    <h3 class="h5">
      Starters
    </h3>
    <lineup-on-player-list>
    </lineup-on-player-list>
  </div>
  <div id="confirm-starter">
  </div>
  <div id="live-off">
    <h3 class="h5">
      Subs
    </h3>
    <lineup-player-list mode="off">
    </lineup-player-list>
  </div>
</div>
`;
/* end snapshot lineup-game-setup tests renders all the tasks */

snapshots["lineup-game-setup tests Starters shows confirm starter UI when proposed starter exists"] = 
`<div id="confirm-starter">
  <div>
    <h5>
      Confirm starter?
    </h5>
    <span class="proposed-player">
      Stored player 1 #5
    </span>
    <span class="proposed-position">
      AM (1)
    </span>
    <mwc-button class="cancel">
      Cancel
    </mwc-button>
    <mwc-button
      autofocus=""
      class="ok"
    >
      Apply
    </mwc-button>
  </div>
</div>
`;
/* end snapshot lineup-game-setup tests Starters shows confirm starter UI when proposed starter exists */

snapshots["lineup-game-setup tests Starters shows errors when all starter positions are empty"] = 
`<span id="starter-errors">
  <mwc-icon>
    report
  </mwc-icon>
  <span class="error">
    Invalid starters: AM1, AM2, GK, HM, LCB, LFB, LW, RCB, RFB, RW, S
  </span>
</span>
`;
/* end snapshot lineup-game-setup tests Starters shows errors when all starter positions are empty */

snapshots["lineup-game-setup tests periods shows periods sections for new game"] = 
`<mwc-dialog
  id="periods-dialog"
  open=""
>
  <div>
    <div class="dialog-header">
      <span>
        Configure periods
      </span>
    </div>
    <mwc-formfield
      alignend=""
      id="num-periods"
      label="Number of Periods"
    >
      <input
        max="4"
        min="1"
        required=""
        type="number"
        value="2"
      >
    </mwc-formfield>
    <mwc-formfield
      alignend=""
      id="period-length"
      label="Period Length"
    >
      <input
        max="60"
        min="10"
        required=""
        type="number"
        value="45"
      >
    </mwc-formfield>
  </div>
  <mwc-button
    dialogaction="save"
    slot="primaryAction"
  >
    Save
  </mwc-button>
  <mwc-button
    dialogaction="close"
    slot="secondaryAction"
  >
    Cancel
  </mwc-button>
</mwc-dialog>
`;
/* end snapshot lineup-game-setup tests periods shows periods sections for new game */

