import { Injectable } from "@nestjs/common";
import { NodeSubtype } from "../../entities/workflow-node.entity";
import { NodeHandler } from "../decorators/node-handler.decorator";
import { BaseNodeHandler, NodeExecutionContext, NodeHandlerResult } from "../interfaces/node-handler.interface";

interface LocationCheckConfig {
  acceptedLocations?: string;
}

@NodeHandler(NodeSubtype.LOCATION_CHECK)
@Injectable()
export class LocationCheckHandler extends BaseNodeHandler {
  get isInline(): boolean {
    return true;
  }

  async execute(ctx: NodeExecutionContext): Promise<NodeHandlerResult> {
    const { config, input } = ctx.payload;
    const acceptedRaw = String((config as LocationCheckConfig).acceptedLocations ?? "");
    const accepted = acceptedRaw
      .split(",")
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);

    const jobs = (input as any).jobs ?? [];

    // If no location filter configured, pass all jobs through
    if (accepted.length === 0) {
      return { output: input as Record<string, unknown> };
    }

    const filtered = jobs.filter((j: any) => {
      const loc = j.location.toLowerCase();
      return accepted.some((a) => loc.includes(a));
    });

    return { output: { ...input, jobs: filtered } as Record<string, unknown> };
  }
}
