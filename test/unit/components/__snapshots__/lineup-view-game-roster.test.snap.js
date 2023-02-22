/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-view-game-roster tests shows no game placeholder when no current game"] = 
`<section>
  <p class="empty-list">
    Game not found.
  </p>
</section>
`;
/* end snapshot lineup-view-game-roster tests shows no game placeholder when no current game */

snapshots["lineup-view-game-roster tests shows roster placeholder when game roster is empty"] = 
`<section>
  <h2>
    Roster: Opponent for new Feb 10
  </h2>
  <div class="empty-list">
    <div>
      Roster is empty.
    </div>
    <mwc-button
      icon="file_copy"
      id="copy-button"
    >
      Copy From Team
    </mwc-button>
  </div>
</section>
`;
/* end snapshot lineup-view-game-roster tests shows roster placeholder when game roster is empty */

snapshots["lineup-view-game-roster tests shows player list when game roster is not empty"] = 
`<section>
  <h2>
    Roster: Opponent for new Feb 10
  </h2>
  <lineup-roster>
  </lineup-roster>
</section>
`;
/* end snapshot lineup-view-game-roster tests shows player list when game roster is not empty */

snapshots["lineup-view-game-roster tests shows no game placeholder when not signed in"] = 
`<section>
  <p class="empty-list">
    Game not found.
  </p>
</section>
`;
/* end snapshot lineup-view-game-roster tests shows no game placeholder when not signed in */

