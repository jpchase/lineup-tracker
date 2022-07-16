/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-game-live tests shows no game placeholder when no current game"] = 
`<div>
  <p class="empty-list">
    Live game not set.
  </p>
</div>
`;
/* end snapshot lineup-game-live tests shows no game placeholder when no current game */

snapshots["lineup-game-live tests shows all player sections for started game"] = 
`<div>
  <div toolbar="">
    <lineup-game-clock id="gameTimer">
    </lineup-game-clock>
    <mwc-button
      disabled=""
      icon="done_all"
      id="complete-button"
    >
      Finish Game
    </mwc-button>
  </div>
  <div id="live-on">
    <h5>
      Playing
    </h5>
    <lineup-on-player-list>
    </lineup-on-player-list>
  </div>
  <div id="live-next">
    <h5>
      Next On
    </h5>
    <div>
      <mwc-button id="sub-apply-btn">
        Sub
      </mwc-button>
      <mwc-button id="sub-discard-btn">
        Discard
      </mwc-button>
    </div>
    <lineup-player-list mode="next">
    </lineup-player-list>
  </div>
  <div id="confirm-sub">
  </div>
  <div id="confirm-swap">
  </div>
  <div id="live-off">
    <h5>
      Subs
    </h5>
    <div>
      <mwc-button id="out-mark-btn">
        Out
      </mwc-button>
    </div>
    <lineup-player-list mode="off">
    </lineup-player-list>
  </div>
  <div id="live-out">
    <h5>
      Unavailable
    </h5>
    <div>
      <mwc-button id="out-return-btn">
        Return
      </mwc-button>
    </div>
    <lineup-player-list mode="out">
    </lineup-player-list>
  </div>
  <div id="live-totals">
    <h5>
      Playing Time
    </h5>
    <lineup-game-shifts>
    </lineup-game-shifts>
  </div>
</div>
`;
/* end snapshot lineup-game-live tests shows all player sections for started game */

snapshots["lineup-game-live tests Subs shows confirm sub UI when proposed sub exists"] = 
`<div id="confirm-sub">
  <div>
    <h5>
      Confirm sub?
    </h5>
    <span class="proposed-player">
      Player 11 #31
    </span>
    <span class="proposed-position">
      CB (Left)
    </span>
    <span class="replaced">
      Player 0
    </span>
    <span class="override-position">
      <span>
        Position:
      </span>
      <select
        id="new-position-select"
        value=""
      >
        <option value="">
          [Keep existing]
        </option>
        <option value="S">
          S
        </option>
        <option value="LW">
          W (Left)
        </option>
        <option value="RW">
          W (Right)
        </option>
        <option value="AM1">
          AM (1)
        </option>
        <option value="AM2">
          AM (2)
        </option>
        <option value="HM">
          HM
        </option>
        <option value="LFB">
          FB (Left)
        </option>
        <option value="LCB">
          CB (Left)
        </option>
        <option value="RCB">
          CB (Right)
        </option>
        <option value="RFB">
          FB (Right)
        </option>
        <option value="GK">
          GK
        </option>
      </select>
    </span>
    <mwc-button class="cancel">
      Cancel
    </mwc-button>
    <mwc-button
      autofocus=""
      class="ok"
    >
      Confirm
    </mwc-button>
  </div>
</div>
`;
/* end snapshot lineup-game-live tests Subs shows confirm sub UI when proposed sub exists */

snapshots["lineup-game-live tests Subs shows confirm swap UI when proposed swap exists"] = 
`<div id="confirm-swap">
  <div>
    <h5>
      Confirm swap?
    </h5>
    <span class="proposed-player">
      Player 0 #0
    </span>
    <span class="proposed-position">
      S
    </span>
    <mwc-button class="cancel">
      Cancel
    </mwc-button>
    <mwc-button
      autofocus=""
      class="ok"
    >
      Confirm
    </mwc-button>
  </div>
</div>
`;
/* end snapshot lineup-game-live tests Subs shows confirm swap UI when proposed swap exists */

snapshots["lineup-game-live tests Subs shows errors when pending subs are invalid"] = 
`<span id="sub-errors">
  <mwc-icon>
    report
  </mwc-icon>
  <span class="error">
    Invalid subs: LCB, S
  </span>
</span>
`;
/* end snapshot lineup-game-live tests Subs shows errors when pending subs are invalid */

