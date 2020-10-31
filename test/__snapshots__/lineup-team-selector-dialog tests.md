# `lineup-team-selector-dialog tests`

#### `renders item for each team in sorted order`

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
    <mwc-list activatable="">
      <mwc-list-item
        aria-disabled="false"
        id="t2"
        mwc-list-item=""
        tabindex="0"
      >
        A team - sorts first
      </mwc-list-item>
      <li
        divider=""
        role="separator"
      >
      </li>
      <mwc-list-item
        aria-disabled="false"
        id="t3"
        mwc-list-item=""
        tabindex="-1"
      >
        Another team (3)
      </mwc-list-item>
      <li
        divider=""
        role="separator"
      >
      </li>
      <mwc-list-item
        aria-disabled="false"
        aria-selected="true"
        id="t1"
        mwc-list-item=""
        selected=""
        tabindex="-1"
      >
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

#### `renders placeholder when no teams created yet`

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
    <p class="empty-list">
      No teams created.
    </p>
  </div>
  <mwc-button
    dialogaction="select"
    disabled=""
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

#### `select team when item clicked`

```html
<mwc-list-item
  activated=""
  aria-disabled="false"
  aria-selected="true"
  id="t2"
  mwc-list-item=""
  selected=""
  tabindex="0"
>
  A team - sorts first
</mwc-list-item>

```
