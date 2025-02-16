/** @format */

import { PlayerResolver, playerResolverContext } from '@app/components/core/player-resolver.js';

export function mockPlayerResolver(parentNode: HTMLElement, resolver: PlayerResolver) {
  parentNode.addEventListener('context-request', (event) => {
    if (event.context === playerResolverContext) {
      event.stopPropagation();
      event.callback(resolver);
    }
  });
}

export function buildPlayerResolverParentNode(resolver: PlayerResolver) {
  const parentNode = document.createElement('div');
  mockPlayerResolver(parentNode, resolver);
  return parentNode;
}
