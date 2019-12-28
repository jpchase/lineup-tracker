# `lineup-view-game-detail tests`

#### `shows no game placeholder when no current game`

```html
<section>
  <p class="empty-list">
    Game not found.
  </p>
</section>

```

#### `shows setup component for new game`

```html
<section>
  <div main-title="">
    Live: Opponent for new Feb 10
  </div>
  <lineup-game-setup>
  </lineup-game-setup>
</section>

```

#### `shows live component for started game`

```html
<section>
  <div main-title="">
    Live: Opponent for new Feb 10
  </div>
  <lineup-game-live>
  </lineup-game-live>
</section>

```

