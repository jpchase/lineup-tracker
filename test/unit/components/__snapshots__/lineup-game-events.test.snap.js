/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-game-events tests rendering shows list of events with common details"] = 
`<table class="is-upgraded mdl-data-table mdl-js-data-table">
  <thead id="events-header">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
  <thead id="events-header">
    <tr>
      <th colspan="3">
        <mwc-icon-button
          icon="close"
          id="cancel-selection-button"
          label="Cancel selection"
        >
        </mwc-icon-button>
        <span id="selection-count">
          3 events
        </span>
        <mwc-icon-button
          icon="edit"
          id="edit-selection-button"
          label="Edit selected events"
        >
        </mwc-icon-button>
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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
      <td class="eventType mdl-data-table__cell--non-numeric">
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

snapshots["lineup-game-events tests event editing shows dialog when edit button clicked"] = 
`<mwc-dialog
  heading="Edit event dates"
  id="edit-dialog"
  open=""
>
  <ul class="fields">
    <li>
      <mwc-formfield label="Custom">
        <mwc-radio
          checked=""
          id="time-custom-radio"
          name="editTimeOptions"
          value="custom"
        >
        </mwc-radio>
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield
        alignend=""
        id="custom-time-field"
        label="Set event time"
      >
        <input
          required=""
          step="1"
          type="time"
        >
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield label="Existing">
        <mwc-radio
          id="time-existing-radio"
          name="editTimeOptions"
          value="existing"
        >
        </mwc-radio>
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield
        alignend=""
        id="existing-time-field"
        label="From existing event"
      >
      </mwc-formfield>
    </li>
  </ul>
  <mwc-button
    dialogaction="save"
    slot="primaryAction"
  >
    Save
  </mwc-button>
  <mwc-button
    dialogaction="close"
    slot="secondaryAction"
  >
    Cancel
  </mwc-button>
</mwc-dialog>
`;
/* end snapshot lineup-game-events tests event editing shows dialog when edit button clicked */

snapshots["lineup-game-events tests event editing shows dialog with multiple events when edit button clicked"] = 
`<mwc-dialog
  heading="Edit event dates"
  id="edit-dialog"
  open=""
>
  <ul class="fields">
    <li>
      <mwc-formfield label="Custom">
        <mwc-radio
          checked=""
          id="time-custom-radio"
          name="editTimeOptions"
          value="custom"
        >
        </mwc-radio>
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield
        alignend=""
        id="custom-time-field"
        label="Set event time"
      >
        <input
          required=""
          step="1"
          type="time"
        >
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield label="Existing">
        <mwc-radio
          id="time-existing-radio"
          name="editTimeOptions"
          value="existing"
        >
        </mwc-radio>
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield
        alignend=""
        id="existing-time-field"
        label="From existing event"
      >
      </mwc-formfield>
    </li>
  </ul>
  <mwc-button
    dialogaction="save"
    slot="primaryAction"
  >
    Save
  </mwc-button>
  <mwc-button
    dialogaction="close"
    slot="secondaryAction"
  >
    Cancel
  </mwc-button>
</mwc-dialog>
`;
/* end snapshot lineup-game-events tests event editing shows dialog with multiple events when edit button clicked */

