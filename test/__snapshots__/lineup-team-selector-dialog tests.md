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
        graphic="icon"
        id="t2"
        mwc-list-item=""
        tabindex="0"
      >
        <span>
          A team - sorts first
        </span>
      </mwc-list-item>
      <li
        divider=""
        role="separator"
      >
      </li>
      <mwc-list-item
        aria-disabled="false"
        graphic="icon"
        id="t3"
        mwc-list-item=""
        tabindex="-1"
      >
        <span>
          Another team (3)
        </span>
      </mwc-list-item>
      <li
        divider=""
        role="separator"
      >
      </li>
      <mwc-list-item
        aria-disabled="false"
        graphic="icon"
        id="t1"
        mwc-list-item=""
        tabindex="-1"
      >
        <span>
          First team id - sorts last
        </span>
        <mwc-icon slot="graphic">
          check
        </mwc-icon>
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
  graphic="icon"
  id="t2"
  mwc-list-item=""
  selected=""
  tabindex="0"
>
  <span>
    A team - sorts first
  </span>
</mwc-list-item>

```
