/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-view-game-detail tests shows no game placeholder when no current game"] = 
`<section>
  <p class="empty-list">
    Game not found.
  </p>
</section>
`;
/* end snapshot lineup-view-game-detail tests shows no game placeholder when no current game */

snapshots["lineup-view-game-detail tests shows setup component for new game"] = 
`<section>
  <h2 main-title="">
    Live: Opponent for new Feb 10
  </h2>
  <lineup-game-setup>
  </lineup-game-setup>
</section>
`;
/* end snapshot lineup-view-game-detail tests shows setup component for new game */

snapshots["lineup-view-game-detail tests shows live component for started game"] = 
`<section>
  <h2 main-title="">
    Live: Opponent for new Feb 10
  </h2>
  <lineup-game-live>
  </lineup-game-live>
</section>
`;
/* end snapshot lineup-view-game-detail tests shows live component for started game */

snapshots["lineup-view-game-detail tests shows signin placeholder when not signed in"] = 
`<section>
  <p class="unauthorized">
    Sign in to view game.
  </p>
</section>
`;
/* end snapshot lineup-view-game-detail tests shows signin placeholder when not signed in */

