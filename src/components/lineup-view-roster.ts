/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
*/

import { html } from '@polymer/lit-element';
import { PageViewElement } from './page-view-element.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

class LineupViewRoster extends (PageViewElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Team: XXX</h2>
        <p>List of players here</p>
      </section>
    `;
  }

}

window.customElements.define('lineup-view-roster', LineupViewRoster);
