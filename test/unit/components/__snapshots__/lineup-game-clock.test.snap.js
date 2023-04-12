/* @web/test-runner snapshot v1 */
export const snapshots = {};
snapshots["lineup-game-clock tests button states only Start button shown when first period is ready to be started"] = 
`<span>
  <span id="game-period">
    Period: 1
  </span>
  <mwc-icon
    hidden=""
    id="period-overdue"
  >
    running_with_errors
  </mwc-icon>
  <span id="period-timer">
    00:00
  </span>
  <mwc-icon-button-toggle
    hidden=""
    id="toggle-button"
    label="Start/pause the clock"
    officon="play_circle_outline"
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <mwc-icon-button
    hidden=""
    icon="stop"
    id="end-button"
    label="End period"
  >
  </mwc-icon-button>
  <mwc-button
    icon="not_started"
    id="start-button"
  >
    Start
  </mwc-button>
</span>
`;
/* end snapshot lineup-game-clock tests button states only Start button shown when first period is ready to be started */

snapshots["lineup-game-clock tests button states only End and toggle buttons shown when period in progress"] = 
`<span>
  <span id="game-period">
    Period: 1
  </span>
  <mwc-icon
    hidden=""
    id="period-overdue"
  >
    running_with_errors
  </mwc-icon>
  <span id="period-timer">
    02:10
  </span>
  <mwc-icon-button-toggle
    id="toggle-button"
    label="Start/pause the clock"
    officon="play_circle_outline"
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <mwc-icon-button
    icon="stop"
    id="end-button"
    label="End period"
  >
  </mwc-icon-button>
  <mwc-button
    hidden=""
    icon="not_started"
    id="start-button"
  >
    Start
  </mwc-button>
</span>
`;
/* end snapshot lineup-game-clock tests button states only End and toggle buttons shown when period in progress */

snapshots["lineup-game-clock tests button states all buttons hidden when game is done"] = 
`<span>
  <span id="game-period">
    Period: 2
  </span>
  <mwc-icon
    hidden=""
    id="period-overdue"
  >
    running_with_errors
  </mwc-icon>
  <span id="period-timer">
    10:00
  </span>
  <mwc-icon-button-toggle
    hidden=""
    id="toggle-button"
    label="Start/pause the clock"
    officon="play_circle_outline"
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <mwc-icon-button
    hidden=""
    icon="stop"
    id="end-button"
    label="End period"
  >
  </mwc-icon-button>
  <mwc-button
    hidden=""
    icon="not_started"
    id="start-button"
  >
    Start
  </mwc-button>
</span>
`;
/* end snapshot lineup-game-clock tests button states all buttons hidden when game is done */

snapshots["lineup-game-clock tests toggle starts with clock not running"] = 
`<span>
  <span id="game-period">
    Period: 1
  </span>
  <mwc-icon
    hidden=""
    id="period-overdue"
  >
    running_with_errors
  </mwc-icon>
  <span id="period-timer">
  </span>
  <mwc-icon-button-toggle
    hidden=""
    id="toggle-button"
    label="Start/pause the clock"
    officon="play_circle_outline"
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <mwc-icon-button
    hidden=""
    icon="stop"
    id="end-button"
    label="End period"
  >
  </mwc-icon-button>
  <mwc-button
    hidden=""
    icon="not_started"
    id="start-button"
  >
    Start
  </mwc-button>
</span>
`;
/* end snapshot lineup-game-clock tests toggle starts with clock not running */

snapshots["lineup-game-clock tests toggle starts running when timer data is running"] = 
`<span>
  <span id="game-period">
    Period: 1
  </span>
  <mwc-icon
    hidden=""
    id="period-overdue"
  >
    running_with_errors
  </mwc-icon>
  <span id="period-timer">
    01:05
  </span>
  <mwc-icon-button-toggle
    hidden=""
    id="toggle-button"
    label="Start/pause the clock"
    officon="play_circle_outline"
    on=""
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <mwc-icon-button
    hidden=""
    icon="stop"
    id="end-button"
    label="End period"
  >
  </mwc-icon-button>
  <mwc-button
    hidden=""
    icon="not_started"
    id="start-button"
  >
    Start
  </mwc-button>
</span>
`;
/* end snapshot lineup-game-clock tests toggle starts running when timer data is running */

snapshots["lineup-game-clock tests toggle stops running when timer data is stopped"] = 
`<span>
  <span id="game-period">
    Period: 1
  </span>
  <mwc-icon
    hidden=""
    id="period-overdue"
  >
    running_with_errors
  </mwc-icon>
  <span id="period-timer">
    00:30
  </span>
  <mwc-icon-button-toggle
    hidden=""
    id="toggle-button"
    label="Start/pause the clock"
    officon="play_circle_outline"
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <mwc-icon-button
    hidden=""
    icon="stop"
    id="end-button"
    label="End period"
  >
  </mwc-icon-button>
  <mwc-button
    hidden=""
    icon="not_started"
    id="start-button"
  >
    Start
  </mwc-button>
</span>
`;
/* end snapshot lineup-game-clock tests toggle stops running when timer data is stopped */

snapshots["lineup-game-clock tests button states Late warning, End and toggle buttons shown when period is overdue"] = 
`<span>
  <span id="game-period">
    Period: 1
  </span>
  <mwc-icon id="period-overdue">
    running_with_errors
  </mwc-icon>
  <span id="period-timer">
    22:15
  </span>
  <mwc-icon-button-toggle
    id="toggle-button"
    label="Start/pause the clock"
    officon="play_circle_outline"
    onicon="pause_circle_outline"
  >
  </mwc-icon-button-toggle>
  <mwc-icon-button
    icon="stop"
    id="end-button"
    label="End period"
  >
  </mwc-icon-button>
  <mwc-button
    hidden=""
    icon="not_started"
    id="start-button"
  >
    Start
  </mwc-button>
</span>
`;
/* end snapshot lineup-game-clock tests button states Late warning, End and toggle buttons shown when period is overdue */

