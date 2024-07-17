/** @format */

import { GameResolver, gameResolverContext } from '@app/components/core/game-resolver.js';

export function mockGameResolver(parentNode: HTMLElement, resolver: GameResolver) {
  parentNode.addEventListener('context-request', (event) => {
    if (event.context === gameResolverContext) {
      event.stopPropagation();
      event.callback(resolver);
    }
  });
}
