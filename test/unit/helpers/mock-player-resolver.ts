import { ContextEvent, UnknownContext } from "@app/components/context.js";
import { PlayerResolver, playerResolverContext } from "@app/components/player-resolver.js";

export function buildPlayerResolverParentNode(resolver: PlayerResolver) {
  const parentNode = document.createElement('div');
  parentNode.addEventListener(ContextEvent.eventName, event => {
    const contextEvent = event as ContextEvent<UnknownContext>;
    if (contextEvent.context.name = playerResolverContext.name) {
      contextEvent.stopPropagation();
      contextEvent.callback(resolver);
    }
  });
  return parentNode;
}
