/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-team-selector tests renders placeholder when no teams created yet"] = 
`<mwc-button
  aria-label="No team selected. Hit enter to select a team."
  icon="arrow_drop_down"
  id="team-switcher-button"
  trailingicon=""
>
  Select a team
</mwc-button>
`;
/* end snapshot lineup-team-selector tests renders placeholder when no teams created yet */

snapshots["lineup-team-selector tests a11y"] = 
`<mwc-button
  aria-label="You are currently working with team First team id - sorts last. Hit enter to switch teams."
  icon="arrow_drop_down"
  id="team-switcher-button"
  trailingicon=""
>
  First team id - sorts last
</mwc-button>
`;
/* end snapshot lineup-team-selector tests a11y */

snapshots["lineup-team-selector-dialog tests renders item for each team in sorted order"] = 
`<mwc-dialog open="">
  <div>
    <div class="dialog-header">
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
`;
/* end snapshot lineup-team-selector-dialog tests renders item for each team in sorted order */

snapshots["lineup-team-selector-dialog tests renders placeholder when no teams created yet"] = 
`<mwc-dialog open="">
  <div>
    <div class="dialog-header">
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
`;
/* end snapshot lineup-team-selector-dialog tests renders placeholder when no teams created yet */

snapshots["lineup-team-selector-dialog tests select team when item clicked"] = 
`<mwc-list-item
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
`;
/* end snapshot lineup-team-selector-dialog tests select team when item clicked */

