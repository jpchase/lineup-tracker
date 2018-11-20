/**
@license
*/

import { html } from '@polymer/lit-element';
import { PageViewElement } from './page-view-element.js';

// These are the elements needed by this element.
import './lineup-roster.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

class LineupViewRoster extends (PageViewElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Team: XXX</h2>
        <lineup-roster></lineup-roster>
      </section>
    `;
  }

}

window.customElements.define('lineup-view-roster', LineupViewRoster);
