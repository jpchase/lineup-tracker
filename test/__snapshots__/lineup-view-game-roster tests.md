# `lineup-view-game-roster tests`

#### `shows no game placeholder when no current game`

```html
<section>
  <p class="empty-list">
    Game not found.
  </p>
</section>
```

#### `shows player list when game roster is not empty`

```html
<section>
  <h2>
    Roster: Opponent for new Feb 10
  </h2>
  <lineup-roster>
  </lineup-roster>
</section>
```

#### `shows roster placeholder when game roster is empty`

```html
<section>
  <h2>
    Roster: Opponent for new Feb 10
  </h2>
  <div class="empty-list">
    <div>
      Roster is empty.
    </div>
    <mwc-button icon="file_copy">
      Copy From Team
    </mwc-button>
  </div>
</section>

```

