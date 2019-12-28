# `lineup-game-live tests`

#### `shows no game placeholder when no current game`

```html
<div>
  <p class="empty-list">
    Live game not set.
  </p>
</div>

```

#### `shows all player sections for started game`

```html
<div>
  <div toolbar="">
    <span id="gameTimer">
      clock here
    </span>
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
    <lineup-player-list mode="next">
    </lineup-player-list>
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

```

