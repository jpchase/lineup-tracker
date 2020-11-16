# `lineup-team-selector tests`

#### `renders placeholder when no teams created yet`

```html
<mwc-button
  aria-label="No team selected. Hit enter to select a team."
  icon="arrow_drop_down"
  id="team-switcher-button"
  trailingicon=""
>
  Select a team
</mwc-button>

```

#### `a11y`

```html
<mwc-button
  aria-label="You are currently working with team First team id - sorts last. Hit enter to switch teams."
  icon="arrow_drop_down"
  id="team-switcher-button"
  trailingicon=""
>
  First team id - sorts last
</mwc-button>
```

