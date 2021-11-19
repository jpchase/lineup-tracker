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
        Set formation
      </a>
    </div>
    <div class="status">
      <mwc-icon>
        more_horiz
      </mwc-icon>
    </div>
  </div>
  <div class="flex-equal-justified step1 task">
    <div class="name">
      <a class="step">
        Set game roster
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
        Set captains
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
        Setup the starting lineup
      </a>
    </div>
    <div class="status">
      <mwc-icon>
        more_horiz
      </mwc-icon>
    </div>
  </div>
  <div class="flex-equal-justified start">
    <mwc-button
      disabled=""
      icon="play_arrow"
    >
      Start game
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
