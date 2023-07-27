/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-game-events tests renders list of events"] = 
`<table class="is-upgraded mdl-data-table mdl-js-data-table">
  <thead>
    <tr>
      <th class="mdl-data-table__cell--non-numeric">
        Time
      </th>
      <th class="mdl-data-table__cell--non-numeric">
        Type
      </th>
      <th class="mdl-data-table__cell--non-numeric">
        Details
      </th>
    </tr>
  </thead>
  <tbody id="events-list">
    <tr data-event-id="subeventid-P11">
      <td class="mdl-data-table__cell--non-numeric">
        2:00:20 PM
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Substitution
      </td>
      <td class="details">
        Player 11 replaced Player 4, at RW
      </td>
    </tr>
    <tr data-event-id="starteventid">
      <td class="mdl-data-table__cell--non-numeric">
        2:00:10 PM
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Period started
      </td>
      <td class="details">
        Start of period 1
      </td>
    </tr>
    <tr data-event-id="setupeventid">
      <td class="mdl-data-table__cell--non-numeric">
        2:00:00 PM
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Setup completed
      </td>
      <td class="details">
        {"clock":{"totalPeriods":2,"periodLength":45}}
      </td>
    </tr>
  </tbody>
</table>
`;
/* end snapshot lineup-game-events tests renders list of events */
