/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-game-clock tests starts with clock not running"] = 
`<span>
  <span id="gamePeriod">
    Period: 1
  </span>
  <mwc-icon-button-toggle
    id="clockToggle"
    label="Start/stop the clock"
    officon="play_circle_outline"
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <span id="periodTimer">
  </span>
  [
  <span id="gameTimer">
  </span>
  ]
</span>
`;
/* end snapshot lineup-game-clock tests starts with clock not running */

snapshots["lineup-game-clock tests starts running when timer data is running"] = 
`<span>
  <span id="gamePeriod">
    Period: 1
  </span>
  <mwc-icon-button-toggle
    id="clockToggle"
    label="Start/stop the clock"
    officon="play_circle_outline"
    on=""
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <span id="periodTimer">
    01:05
  </span>
  [
  <span id="gameTimer">
  </span>
  ]
</span>
`;
/* end snapshot lineup-game-clock tests starts running when timer data is running */

snapshots["lineup-game-clock tests stops running when timer data is stopped"] = 
`<span>
  <span id="gamePeriod">
    Period: 1
  </span>
  <mwc-icon-button-toggle
    id="clockToggle"
    label="Start/stop the clock"
    officon="play_circle_outline"
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <span id="periodTimer">
    00:30
  </span>
  [
  <span id="gameTimer">
  </span>
  ]
</span>
`;
/* end snapshot lineup-game-clock tests stops running when timer data is stopped */

