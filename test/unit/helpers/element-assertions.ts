import { Assertion } from '@esm-bundle/chai';

function isElementShown(element: Element) {
  const style = getComputedStyle(element, null);
  console.log(`isElementShown: ${style.display}, ${style.visibility}`);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapsed';
}

declare global {
  export namespace Chai {
    interface Assertion {
      shown: Assertion;
    }
  }
}

export function addElementAssertions() {
  Assertion.addProperty('shown', function () {
    const element = this._obj as Element;
    const shown = isElementShown(element);

    this.assert(
      shown,
      `expected element to be shown`,
      `expected element to not be shown`,
      undefined // not used, required by type definition
    );
  });
}
