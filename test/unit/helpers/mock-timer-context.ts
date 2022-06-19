import { synchronizedTimerContext, SynchronizedTimerNotifier } from "@app/components/synchronized-timer.js";

export function mockTimerContext(parentNode: HTMLElement, notifier: SynchronizedTimerNotifier) {
  parentNode.addEventListener('context-request', event => {
    if (event.context == synchronizedTimerContext) {
      event.stopPropagation();
      event.callback(notifier);
    }
  });
}
