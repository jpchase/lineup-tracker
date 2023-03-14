import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-view404')
export class LineupView404 extends PageViewElement {
  override render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Oops! You hit a 404</h2>
        <p>The page you're looking for doesn't seem to exist. Head back
           <a href="/">home</a> and try again?
        </p>
      </section>
    `
  }
}
