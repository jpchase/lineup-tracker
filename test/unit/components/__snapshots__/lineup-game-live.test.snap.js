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
  <div id="live-off">
    <h5>
      Subs
    </h5>
    <lineup-player-list mode="off">
    </lineup-player-list>
  </div>
  <div id="live-out">
    <h5>
      Unavailable
    </h5>
    <lineup-player-list mode="out">
    </lineup-player-list>
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
      Player 1 #11
    </span>
    <span class="proposed-position">
      CB (Left)
    </span>
    <span class="replaced">
      Player 0
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

