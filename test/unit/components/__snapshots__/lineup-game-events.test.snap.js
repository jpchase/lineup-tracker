/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-game-events tests rendering shows list of events with common details"] = 
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
    <tr data-event-id="endeventid-1">
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:40 PM
        </span>
        <span class="relative">
          [00:30]
        </span>
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Period completed
      </td>
      <td class="details">
        End of period 1
      </td>
    </tr>
    <tr data-event-id="subeventid-P12">
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:30 PM
        </span>
        <span class="relative">
          [00:20]
        </span>
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Substitution
      </td>
      <td class="details">
        Player 12 replaced Player 5, at LFB
      </td>
    </tr>
    <tr data-event-id="swapeventid-P8">
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:30 PM
        </span>
        <span class="relative">
          [00:20]
        </span>
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Position changed
      </td>
      <td class="details">
        Player 8 moved to RFB (from
        LFB)
      </td>
    </tr>
    <tr data-event-id="subeventid-P11">
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:20 PM
        </span>
        <span class="relative">
          [00:10]
        </span>
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Substitution
      </td>
      <td class="details">
        Player 11 replaced Player 4, at RW
      </td>
    </tr>
    <tr data-event-id="starteventid-1">
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:10 PM
        </span>
        <span class="relative">
          [00:00]
        </span>
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
        <span class="absolute">
          2:00:00 PM
        </span>
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
/* end snapshot lineup-game-events tests rendering shows list of events with common details */

snapshots["lineup-game-events tests rendering shows list with selected events highlighted"] = 
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
    <tr data-event-id="endeventid-1">
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:40 PM
        </span>
        <span class="relative">
          [00:30]
        </span>
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Period completed
      </td>
      <td class="details">
        End of period 1
      </td>
    </tr>
    <tr
      data-event-id="subeventid-P12"
      selected=""
    >
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:30 PM
        </span>
        <span class="relative">
          [00:20]
        </span>
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Substitution
      </td>
      <td class="details">
        Player 12 replaced Player 5, at LFB
      </td>
    </tr>
    <tr data-event-id="swapeventid-P8">
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:30 PM
        </span>
        <span class="relative">
          [00:20]
        </span>
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Position changed
      </td>
      <td class="details">
        Player 8 moved to RFB (from
        LFB)
      </td>
    </tr>
    <tr
      data-event-id="subeventid-P11"
      selected=""
    >
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:20 PM
        </span>
        <span class="relative">
          [00:10]
        </span>
      </td>
      <td class="mdl-data-table__cell--non-numeric playerName">
        Substitution
      </td>
      <td class="details">
        Player 11 replaced Player 4, at RW
      </td>
    </tr>
    <tr
      data-event-id="starteventid-1"
      selected=""
    >
      <td class="mdl-data-table__cell--non-numeric">
        <span class="absolute">
          2:00:10 PM
        </span>
        <span class="relative">
          [00:00]
        </span>
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
        <span class="absolute">
          2:00:00 PM
        </span>
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
/* end snapshot lineup-game-events tests rendering shows list with selected events highlighted */

