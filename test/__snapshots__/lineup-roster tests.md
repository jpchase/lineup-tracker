# `lineup-roster tests`

#### `shows no players placeholder for empty roster`

```html
<div>
  <p class="empty-list">
    No players in roster.
  </p>
  <mwc-fab
    icon="person_add"
    label="Add Player"
  >
  </mwc-fab>
  <lineup-roster-modify>
  </lineup-roster-modify>
</div>
```

#### `renders list with single player`

```html
<div>
  <div class="list">
    <div>
      <lineup-roster-item>
      </lineup-roster-item>
    </div>
  </div>
  <mwc-fab
    icon="person_add"
    label="Add Player"
  >
  </mwc-fab>
  <lineup-roster-modify>
  </lineup-roster-modify>
</div>

```

#### `renders list with multiple players`

```html
<div>
  <div class="list">
    <div>
      <lineup-roster-item>
      </lineup-roster-item>
    </div>
    <div>
      <lineup-roster-item>
      </lineup-roster-item>
    </div>
    <div>
      <lineup-roster-item>
      </lineup-roster-item>
    </div>
    <div>
      <lineup-roster-item>
      </lineup-roster-item>
    </div>
    <div>
      <lineup-roster-item>
      </lineup-roster-item>
    </div>
    <div>
      <lineup-roster-item>
      </lineup-roster-item>
    </div>
  </div>
  <mwc-fab
    icon="person_add"
    label="Add Player"
  >
  </mwc-fab>
  <lineup-roster-modify>
  </lineup-roster-modify>
</div>

```

