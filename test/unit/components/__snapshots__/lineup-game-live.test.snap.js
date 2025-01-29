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
    <h3>
      Playing
    </h3>
    <lineup-on-player-list>
    </lineup-on-player-list>
  </div>
  <div id="live-next">
    <h3>
      Next On
    </h3>
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
    <h3>
      Subs
    </h3>
    <div>
      <mwc-button id="out-mark-btn">
        Out
      </mwc-button>
    </div>
    <lineup-player-list mode="off">
    </lineup-player-list>
  </div>
  <div id="live-out">
    <h3>
      Unavailable
    </h3>
    <div>
      <mwc-button id="out-return-btn">
        Return
      </mwc-button>
    </div>
    <lineup-player-list mode="out">
    </lineup-player-list>
  </div>
  <div id="live-totals">
    <h3>
      Playing Time
    </h3>
    <lineup-game-shifts>
    </lineup-game-shifts>
  </div>
  <div id="events">
    <h3>
      History
    </h3>
    <lineup-game-events>
    </lineup-game-events>
  </div>
</div>
`;
/* end snapshot lineup-game-live tests shows all player sections for started game */

snapshots["lineup-game-live tests Subs shows confirm sub UI when proposed sub exists"] = 
`<div id="confirm-sub">
  <div>
    <h3>
      Confirm sub?
    </h3>
    <span class="proposed-player">
      Player 11 #31
    </span>
    <span class="proposed-position">
      LCB
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
        title="Override target position for sub"
        value=""
      >
        <option value="">
          [Keep existing]
        </option>
        <option value="S">
          S
        </option>
        <option value="LW">
          LW
        </option>
        <option value="RW">
          RW
        </option>
        <option value="AM1">
          AM1
        </option>
        <option value="AM2">
          AM2
        </option>
        <option value="HM">
          HM
        </option>
        <option value="LFB">
          LFB
        </option>
        <option value="LCB">
          LCB
        </option>
        <option value="RCB">
          RCB
        </option>
        <option value="RFB">
          RFB
        </option>
        <option value="GK">
          GK
        </option>
      </select>
    </span>
    <mwc-button class="cancel">
      Cancel
    </mwc-button>
    <mwc-button class="ok">
      Confirm
    </mwc-button>
  </div>
</div>
`;
/* end snapshot lineup-game-live tests Subs shows confirm sub UI when proposed sub exists */

snapshots["lineup-game-live tests Subs shows confirm swap UI when proposed swap exists"] = 
`<div id="confirm-swap">
  <div>
    <h3>
      Confirm swap?
    </h3>
    <span class="proposed-player">
      Player 0 #0
    </span>
    <span class="proposed-position">
      S
    </span>
    <mwc-button class="cancel">
      Cancel
    </mwc-button>
    <mwc-button class="ok">
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

