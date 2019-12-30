# `lineup-player-list tests`

#### `shows no players placeholder for empty list`

```html
<div>
  <p class="empty-list">
    No players.
  </p>
</div>

```

#### `mode [off]: includes players without status set`

```html
<div>
  <div class="list">
    <lineup-player-card>
    </lineup-player-card>
    <lineup-player-card>
    </lineup-player-card>
    <lineup-player-card>
    </lineup-player-card>
  </div>
</div>

```

#### `mode [next]: shows no players placeholder when input list has no matching players`

```html
<div>
  <p class="empty-list">
    No players.
  </p>
</div>

```

#### `mode [off]: shows no players placeholder when input list has no matching players`

```html
<div>
  <p class="empty-list">
    No players.
  </p>
</div>

```

#### `mode [out]: shows no players placeholder when input list has no matching players`

```html
<div>
  <p class="empty-list">
    No players.
  </p>
</div>

```

