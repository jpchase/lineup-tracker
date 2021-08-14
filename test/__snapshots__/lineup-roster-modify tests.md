# `lineup-roster-modify tests`

## `create mode`

####   `starts empty`

```html
<div>
  <h2>
    New Player
  </h2>
  <mwc-formfield
    alignend=""
    id="nameField"
    label="Name"
  >
    <input
      aria-label="Name"
      minlength="2"
      required=""
      type="text"
      value=""
    >
  </mwc-formfield>
  <mwc-formfield
    alignend=""
    id="uniformNumberField"
    label="Uniform Number"
  >
    <input
      aria-label="Uniform Number"
      max="99"
      min="1"
      required=""
      type="number"
    >
  </mwc-formfield>
  <div class="buttons">
    <mwc-button
      class="cancel"
      raised=""
    >
      Cancel
    </mwc-button>
    <mwc-button
      autofocus=""
      class="save"
      raised=""
    >
      Save
    </mwc-button>
  </div>
</div>
```

## `edit mode`

####   `starts with existing player data populated`

```html
<div>
  <h2>
    Edit Player: Existing Player
  </h2>
  <mwc-formfield
    alignend=""
    id="nameField"
    label="Name"
  >
    <input
      aria-label="Name"
      minlength="2"
      required=""
      type="text"
      value="Existing Player"
    >
  </mwc-formfield>
  <mwc-formfield
    alignend=""
    id="uniformNumberField"
    label="Uniform Number"
  >
    <input
      aria-label="Uniform Number"
      max="99"
      min="1"
      required=""
      type="number"
      value="2"
    >
  </mwc-formfield>
  <div class="buttons">
    <mwc-button
      class="cancel"
      raised=""
    >
      Cancel
    </mwc-button>
    <mwc-button
      autofocus=""
      class="save"
      raised=""
    >
      Save
    </mwc-button>
  </div>
</div>

```

