import { html, HTMLTemplateResult, LitElement, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';

// The type and interface is required to get the typing to work.
// See https://lit.dev/docs/composition/mixins/#mixins-in-typescript.

type Constructor<T = {}> = new (...args: any[]) => T;

export declare class PageViewInterface {
  // Is the element visible.
  active: boolean;
  // Is the element finished loading any data.
  ready: boolean;
  // Clears any data loaded in the element, including marking it as not ready.
  protected resetData(): void;

  // -- START: view-inherited members
  // These members are to be overridden by the view element.

  // Name of the property that determines which data is loaded.
  protected keyPropertyName: string;
  // Load data in response to a change in the key property.
  protected loadData(): void;
  protected resetDataProperties(): void;
  protected isDataReady(): boolean;
  // -- END: view-inherited members

  // -- START: internal members
  // These members are for internal use by the mixin(s). They should not
  // be used or overridden by the view element.

  // Attempt to load data, if all key propert(ies) are available.
  protected maybeLoadData(): void;
  // Attempt to set the element as ready, if all data has been loaded.
  protected maybeSetReady(): void;
  // -- END: internal members
}

export declare class AuthorizedViewInterface extends PageViewInterface {
  // Is the user authorized to access this element.
  authorized: boolean;

  // -- START: view-inherited members
  // These members are to be overridden by the view element.

  // Renders the view, when authorized.
  protected renderView(): HTMLTemplateResult;
  // Description of the authorized action/content, shown when not authorized.
  protected getAuthorizedDescription(): string;
  // -- END: view-inherited members
}

export const PageViewMixin = <T extends Constructor<LitElement>, K extends keyof T>(superClass: T) => {
  class PageViewClass extends superClass {

    @property({ type: Boolean })
    public active = false;

    @property({ type: Boolean, reflect: true })
    public ready = false;

    protected keyPropertyName?: K;

    // Only render this page if it's actually visible.
    override shouldUpdate() {
      return this.active;
    }

    override willUpdate(changedProperties: PropertyValues) {
      super.willUpdate(changedProperties);

      if (this.keyPropertyName && changedProperties.has(this.keyPropertyName)) {
        // The properties that key the view's data have changed. First, clear any
        // existing data. Second, load data for the new key properties, if possible.
        this.resetData();
        this.maybeLoadData();
        return;
      }

      // Other properties (non-keys) have changed, which means the data may now
      // be loaded.
      this.maybeSetReady();
    }

    protected maybeSetReady() {
      if (!this.ready && this.isDataReady()) {
        this.ready = true;
      }
    }

    protected resetData() {
      this.ready = false;
      this.resetDataProperties();
    }

    // Load data, if all keys are available.
    protected maybeLoadData() {
      // TODO: Find a less hacky way to do this.
      const keyValue = ((this as any)[this.keyPropertyName]) as string;// this.getKeyProperty();
      if (keyValue) {
        this.loadData();
      }
    }

    // Load data needed to render the element, in response to the key property changing.
    // To be overridden by the element.
    protected loadData() { }

    // Clear any data properties stored in the element.
    // To be overridden by the element.
    protected resetDataProperties() { }

    // Check if the element has all the data needed to render.
    // To be overridden by the element.
    protected isDataReady(): boolean {
      return false;
    }
  };

  return PageViewClass as unknown as Constructor<PageViewInterface> & T;
}

export const AuthorizedViewMixin = <T extends Constructor<PageViewInterface> & Constructor<LitElement>>(superClass: T) => {
  class AuthorizedViewClass extends superClass {

    @state()
    protected authorized = false;

    override willUpdate(changedProperties: PropertyValues) {
      super.willUpdate(changedProperties);

      if (changedProperties.has('authorized')) {
        this.resetData();
        this.maybeLoadData();
        return;
      }
    }

    protected override maybeLoadData() {
      if (this.authorized) {
        super.maybeLoadData();
      }
    }

    protected override maybeSetReady() {
      if (this.authorized) {
        super.maybeSetReady();
      }
    }

    override render() {
      if (!this.authorized) {
        // TODO: Extract into an <lineup-unauthorized> component, and
        // use shared styles.
        return html`
        <style>
          :host {
            display: block;
            box-sizing: border-box;
          }

          [hidden] {
            display: none !important;
          }

          section {
            padding: 24px;
            background: var(--app-section-odd-color);
          }

          section > * {
            max-width: 600px;
            margin-right: auto;
            margin-left: auto;
          }

          section:nth-of-type(even) {
            background: var(--app-section-even-color);
          }

          .unauthorized {
            text-align: center;
            white-space: nowrap;
          }
        </style>
        <section>
          <p class="unauthorized">
            Sign in to ${this.getAuthorizedDescription()}.
          </p>
        </section>
      `;
      }
      return this.renderView();
    }

    protected renderView(): HTMLTemplateResult {
      throw new TypeError('The renderView() method must be overridden');
    }

    protected getAuthorizedDescription(): string {
      return 'view content';
    }
  };

  return AuthorizedViewClass as unknown as Constructor<AuthorizedViewInterface> & T;
}

export const PageViewElement = PageViewMixin(LitElement);
export const AuthorizedViewElement = AuthorizedViewMixin(PageViewElement);
