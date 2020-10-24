# `lineup-team-selector tests`

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

## `team selection dialog`

####   `renders item for each team in sorted order`

```html
<mwc-dialog open="">
  <div>
    <div>
      <span>
        Select a team
      </span>
      <mwc-button
        dialogaction="new-team"
        label="New Team"
      >
      </mwc-button>
    </div>
    <mwc-list>
      <mwc-list-item id="t2">
        A team - sorts first
      </mwc-list-item>
      <li
        divider=""
        role="separator"
      >
      </li>
      <mwc-list-item id="t3">
        Another team (3)
      </mwc-list-item>
      <li
        divider=""
        role="separator"
      >
      </li>
      <mwc-list-item id="t1">
        First team id - sorts last
      </mwc-list-item>
      <li
        divider=""
        role="separator"
      >
      </li>
    </mwc-list>
  </div>
  <mwc-button
    dialogaction="select"
    slot="primaryAction"
  >
    Select
  </mwc-button>
  <mwc-button
    dialogaction="close"
    slot="secondaryAction"
  >
    Cancel
  </mwc-button>
</mwc-dialog>

```
