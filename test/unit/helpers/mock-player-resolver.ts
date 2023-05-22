/** @format */

import { PlayerResolver, playerResolverContext } from '@app/components/player-resolver.js';

export function buildPlayerResolverParentNode(resolver: PlayerResolver) {
  const parentNode = document.createElement('div');
  parentNode.addEventListener('context-request', (event) => {
    if (event.context === playerResolverContext) {
      event.stopPropagation();
      event.callback(resolver);
    }
  });
  return parentNode;
}
