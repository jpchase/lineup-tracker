/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["lineup-game-create tests starts empty"] = 
`<mwc-dialog
  heading="New Game"
  id="create-dialog"
  open=""
>
  <ul class="fields">
    <li>
      <mwc-formfield
        alignend=""
        dialoginitialfocus=""
        id="nameField"
        label="Name"
      >
        <input
          aria-label="Name"
          minlength="2"
          required=""
          type="text"
        >
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield
        alignend=""
        id="dateField"
        label="Date"
      >
        <input
          aria-label="Date"
          required=""
          type="date"
        >
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield
        alignend=""
        id="timeField"
        label="Time"
      >
        <input
          aria-label="Time"
          required=""
          type="time"
        >
      </mwc-formfield>
    </li>
    <li>
      <mwc-formfield
        alignend=""
        id="opponentField"
        label="Opponent"
      >
        <input
          aria-label="Opponent"
          minlength="2"
          required=""
          type="text"
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
/* end snapshot lineup-game-create tests starts empty */

