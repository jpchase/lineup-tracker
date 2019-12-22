# `lineup-view-game-detail tests`

#### `shows no game placeholder when no current game`

```html
<section>
  <p class="empty-list">
    Game not found.
  </p>
</section>

```

#### `shows all player sections for started game`

```html
<section>
  <div main-title="">
    Live: Opponent for new Feb 10
  </div>
  <div toolbar="">
    <span id="gameTimer">
      clock here
    </span>
  </div>
  <div>
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
</section>

```

