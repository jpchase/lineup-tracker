/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-roster tests shows no players placeholder for empty roster"] = 
`<div>
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
`;
/* end snapshot lineup-roster tests shows no players placeholder for empty roster */

snapshots["lineup-roster tests renders list with single player"] = 
`<div>
  <mwc-list noninteractive="">
    <mwc-list-item
      aria-disabled="false"
      graphic="avatar"
      hasmeta=""
      id="P0"
      mwc-list-item=""
      tabindex="-1"
      twoline=""
    >
      <span class="name">
        Player [1 for sorting] 0
      </span>
      <span
        class="positions"
        slot="secondary"
      >
        CB, FB, HM
      </span>
      <span
        class="avatar"
        slot="graphic"
      >
        #0
      </span>
      <span
        class="actions"
        slot="meta"
      >
        NN games
      </span>
    </mwc-list-item>
    <li
      divider=""
      role="separator"
    >
    </li>
  </mwc-list>
  <mwc-fab
    icon="person_add"
    label="Add Player"
  >
  </mwc-fab>
  <lineup-roster-modify>
  </lineup-roster-modify>
</div>
`;
/* end snapshot lineup-roster tests renders list with single player */

snapshots["lineup-roster tests renders list with multiple players"] = 
`<div>
  <mwc-list noninteractive="">
    <mwc-list-item
      aria-disabled="false"
      graphic="avatar"
      hasmeta=""
      id="P5"
      mwc-list-item=""
      tabindex="-1"
      twoline=""
    >
      <span class="name">
        Player [1 for sorting] 5
      </span>
      <span
        class="positions"
        slot="secondary"
      >
        AM
      </span>
      <span
        class="avatar"
        slot="graphic"
      >
        #25
      </span>
      <span
        class="actions"
        slot="meta"
      >
        NN games
      </span>
    </mwc-list-item>
    <li
      divider=""
      role="separator"
    >
    </li>
    <mwc-list-item
      aria-disabled="false"
      graphic="avatar"
      hasmeta=""
      id="P4"
      mwc-list-item=""
      tabindex="-1"
      twoline=""
    >
      <span class="name">
        Player [2 for sorting] 4
      </span>
      <span
        class="positions"
        slot="secondary"
      >
        S, OM
      </span>
      <span
        class="avatar"
        slot="graphic"
      >
        #14
      </span>
      <span
        class="actions"
        slot="meta"
      >
        NN games
      </span>
    </mwc-list-item>
    <li
      divider=""
      role="separator"
    >
    </li>
    <mwc-list-item
      aria-disabled="false"
      graphic="avatar"
      hasmeta=""
      id="P3"
      mwc-list-item=""
      tabindex="-1"
      twoline=""
    >
      <span class="name">
        Player [3 for sorting] 3
      </span>
      <span
        class="positions"
        slot="secondary"
      >
        CB, FB, HM
      </span>
      <span
        class="avatar"
        slot="graphic"
      >
        #3
      </span>
      <span
        class="actions"
        slot="meta"
      >
        NN games
      </span>
    </mwc-list-item>
    <li
      divider=""
      role="separator"
    >
    </li>
    <mwc-list-item
      aria-disabled="false"
      graphic="avatar"
      hasmeta=""
      id="P2"
      mwc-list-item=""
      tabindex="-1"
      twoline=""
    >
      <span class="name">
        Player [4 for sorting] 2
      </span>
      <span
        class="positions"
        slot="secondary"
      >
        AM
      </span>
      <span
        class="avatar"
        slot="graphic"
      >
        #22
      </span>
      <span
        class="actions"
        slot="meta"
      >
        NN games
      </span>
    </mwc-list-item>
    <li
      divider=""
      role="separator"
    >
    </li>
    <mwc-list-item
      aria-disabled="false"
      graphic="avatar"
      hasmeta=""
      id="P1"
      mwc-list-item=""
      tabindex="-1"
      twoline=""
    >
      <span class="name">
        Player [5 for sorting] 1
      </span>
      <span
        class="positions"
        slot="secondary"
      >
        S, OM
      </span>
      <span
        class="avatar"
        slot="graphic"
      >
        #11
      </span>
      <span
        class="actions"
        slot="meta"
      >
        NN games
      </span>
    </mwc-list-item>
    <li
      divider=""
      role="separator"
    >
    </li>
    <mwc-list-item
      aria-disabled="false"
      graphic="avatar"
      hasmeta=""
      id="P0"
      mwc-list-item=""
      tabindex="-1"
      twoline=""
    >
      <span class="name">
        Player [6 for sorting] 0
      </span>
      <span
        class="positions"
        slot="secondary"
      >
        CB, FB, HM
      </span>
      <span
        class="avatar"
        slot="graphic"
      >
        #0
      </span>
      <span
        class="actions"
        slot="meta"
      >
        NN games
      </span>
    </mwc-list-item>
    <li
      divider=""
      role="separator"
    >
    </li>
  </mwc-list>
  <mwc-fab
    icon="person_add"
    label="Add Player"
  >
  </mwc-fab>
  <lineup-roster-modify>
  </lineup-roster-modify>
</div>
`;
/* end snapshot lineup-roster tests renders list with multiple players */

snapshots["lineup-roster tests add button hidden when adds are not allowed"] = 
`<div>
  <p class="empty-list">
    No players in roster.
  </p>
  <lineup-roster-modify>
  </lineup-roster-modify>
</div>
`;
/* end snapshot lineup-roster tests add button hidden when adds are not allowed */

