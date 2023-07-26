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
        SUBIN
      </td>
      <td class="details">
        {"replaced":"P4"}
      </td>
    </tr>
    <tr data-event-id="subeventid-P4">
      <td class="mdl-data-table__cell--non-numeric">
        2:00:20 PM
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        SUBOUT
      </td>
      <td class="details">
        {}
      </td>
    </tr>
    <tr data-event-id="starteventid">
      <td class="mdl-data-table__cell--non-numeric">
        2:00:10 PM
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        PERIODSTART
      </td>
      <td class="details">
        {"clock":{"currentPeriod":1,"startTime":1451674810000}}
      </td>
    </tr>
    <tr data-event-id="setupeventid">
      <td class="mdl-data-table__cell--non-numeric">
        2:00:00 PM
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        SETUP
      </td>
      <td class="details">
        {"clock":{"totalPeriods":2,"periodLength":45}}
      </td>
    </tr>
  </tbody>
</table>
`;
/* end snapshot lineup-game-events tests renders list of events */
