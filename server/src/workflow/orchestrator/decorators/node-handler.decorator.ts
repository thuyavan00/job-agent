import { SetMetadata } from "@nestjs/common";
import type { NodeSubtype } from "../../entities/workflow-node.entity";

export const NODE_HANDLER_SUBTYPES = "node_handler_subtypes";

/** Marks a BaseNodeHandler subclass as the handler for one or more NodeSubtype values */
export const NodeHandler = (...subtypes: NodeSubtype[]): ClassDecorator =>
  SetMetadata(NODE_HANDLER_SUBTYPES, subtypes);
