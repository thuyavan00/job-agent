import { DiscoveryService, Reflector } from "@nestjs/core";
import type { Provider } from "@nestjs/common";
import { BaseNodeHandler } from "../interfaces/node-handler.interface";
import { NODE_HANDLER_SUBTYPES } from "../decorators/node-handler.decorator";
import type { NodeSubtype } from "../../entities/workflow-node.entity";

export const NODE_HANDLER_MAP = "NODE_HANDLER_MAP";

/**
 * Factory provider that scans all NestJS providers for BaseNodeHandler subclasses
 * decorated with @NodeHandler(...subtypes) and builds a Map<NodeSubtype, BaseNodeHandler>.
 *
 * To add a new handler: create class, extend BaseNodeHandler, add @NodeHandler, add to module providers.
 * No changes needed here.
 */
export const handlerRegistryProvider: Provider = {
  provide: NODE_HANDLER_MAP,
  inject: [DiscoveryService, Reflector],
  useFactory: (
    discovery: DiscoveryService,
    reflector: Reflector,
  ): Map<NodeSubtype, BaseNodeHandler> => {
    const map = new Map<NodeSubtype, BaseNodeHandler>();

    for (const wrapper of discovery.getProviders()) {
      const instance = wrapper.instance;
      if (!instance || !(instance instanceof BaseNodeHandler)) continue;

      const subtypes: NodeSubtype[] =
        reflector.get(NODE_HANDLER_SUBTYPES, instance.constructor) ?? [];

      for (const subtype of subtypes) {
        map.set(subtype, instance);
      }
    }

    return map;
  },
};
