import { LitElement, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';

// The type and interface is required to get the typing to work.
// See https://lit.dev/docs/composition/mixins/#mixins-in-typescript.

type Constructor<T = {}> = new (...args: any[]) => T;

export declare class PageViewInterface {
  // Is the element visible.
  active: boolean;
  // Is the element finished loading any data.
  ready: boolean;
  protected resetData(): void;

  // These members are to be overridden.
  // Name of the property that determines which data is loaded.
  protected keyPropertyName: string;
  // Load data in response to a change in the key property.
  protected loadData(): void;
  protected resetDataProperties(): void;
  protected isDataReady(): boolean;
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
        // TODO: Find a less hacky way to do this.
        const keyValue = ((this as any)[this.keyPropertyName]) as string;// this.getKeyProperty();
        this.resetData();
        if (keyValue) {
          this.loadData();
        }
        return;
      }

      if (!this.ready && this.isDataReady()) {
        this.ready = true;
      }
    }

    // Reset the element, including marking it as not ready.
    protected resetData() {
      this.ready = false;
      this.resetDataProperties();
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

export const PageViewElement = PageViewMixin(LitElement);
