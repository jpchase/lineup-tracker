import { pageRouterContext, PageRouter } from "@app/components/page-router.js";

export function mockPageRouter(parentNode: HTMLElement, router: PageRouter) {
  parentNode.addEventListener('context-request', event => {
    if (event.context == pageRouterContext) {
      event.stopPropagation();
      event.callback(router);
    }
  });
}
