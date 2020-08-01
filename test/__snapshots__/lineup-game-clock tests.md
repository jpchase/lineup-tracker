# `lineup-game-clock tests`

#### `starts with clock not running`

```html
<span>
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
```

#### `starts running when timer data is running`

```html
<span>
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
```

#### `stops running when timer data is stopped`

```html
<span>
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

```

