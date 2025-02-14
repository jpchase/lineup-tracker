/** @format */

import { PageRouter, pageRouterContext } from '@app/components/core/page-router.js';

export function mockPageRouter(parentNode: HTMLElement, router: PageRouter) {
  parentNode.addEventListener('context-request', (event) => {
    if (event.context === pageRouterContext) {
      event.stopPropagation();
      event.callback(router);
    }
  });
}
