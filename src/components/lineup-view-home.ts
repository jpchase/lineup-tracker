import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-view-home')
export class LineupViewHome extends PageViewElement {
  override render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Games</h2>
        <p>Upcoming games widget to be here</p>
      </section>
    `;
  }
}
