/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
*/

import { LitElement, html, property } from '@polymer/lit-element';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';

class LineupApp extends LitElement {
  protected render() {
    return html`
    <style>
      :host {
        display: block;
      }
    </style>

    <!-- Header -->
    <h1>Lineup Tracker</h1>
    `;
  }

  constructor() {
    super();
    // To force all event listeners for gestures to be passive.
    // See https://www.polymer-project.org/3.0/docs/devguide/settings#setting-passive-touch-gestures
    setPassiveTouchGestures(true);
  }
}

window.customElements.define('lineup-app', LineupApp);
