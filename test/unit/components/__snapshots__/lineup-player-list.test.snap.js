/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-player-list tests shows no players placeholder for empty list"] = 
`<div>
  <p class="empty-list">
    No players.
  </p>
</div>
`;
/* end snapshot lineup-player-list tests shows no players placeholder for empty list */

snapshots["lineup-player-list tests mode [off]: includes players without status set"] = 
`<div>
  <div class="list">
    <lineup-player-card>
    </lineup-player-card>
    <lineup-player-card>
    </lineup-player-card>
    <lineup-player-card>
    </lineup-player-card>
  </div>
</div>
`;
/* end snapshot lineup-player-list tests mode [off]: includes players without status set */

snapshots["lineup-player-list tests mode [next]: shows no players placeholder when input list has no matching players"] = 
`<div>
  <p class="empty-list">
    No players.
  </p>
</div>
`;
/* end snapshot lineup-player-list tests mode [next]: shows no players placeholder when input list has no matching players */

snapshots["lineup-player-list tests mode [off]: shows no players placeholder when input list has no matching players"] = 
`<div>
  <p class="empty-list">
    No players.
  </p>
</div>
`;
/* end snapshot lineup-player-list tests mode [off]: shows no players placeholder when input list has no matching players */

snapshots["lineup-player-list tests mode [out]: shows no players placeholder when input list has no matching players"] = 
`<div>
  <p class="empty-list">
    No players.
  </p>
</div>
`;
/* end snapshot lineup-player-list tests mode [out]: shows no players placeholder when input list has no matching players */

