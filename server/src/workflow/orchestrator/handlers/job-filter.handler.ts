import { Injectable } from "@nestjs/common";
import { NodeSubtype } from "../../entities/workflow-node.entity";
import { NodeHandler } from "../decorators/node-handler.decorator";
import { BaseNodeHandler, NodeExecutionContext, NodeHandlerResult } from "../interfaces/node-handler.interface";

interface JobFilterConfig {
  minSalary?: number;
  maxSalary?: number;
  requiredKeywords?: string[];
  excludeCompanies?: string[];
  remoteOnly?: boolean;
}

@NodeHandler(NodeSubtype.JOB_FILTER)
@Injectable()
export class JobFilterHandler extends BaseNodeHandler {
  get isInline(): boolean {
    return true;
  }

  async execute(ctx: NodeExecutionContext): Promise<NodeHandlerResult> {
    const { config, input } = ctx.payload;
    const { minSalary, maxSalary, requiredKeywords = [], excludeCompanies = [], remoteOnly } =
      config as JobFilterConfig;
    const jobs = (input as any).jobs ?? [];

    const filtered = jobs.filter((j: any) => {
      if (remoteOnly && !j.location.toLowerCase().includes("remote")) return false;
      if (
        excludeCompanies.some((c) => j.company.toLowerCase().includes(c.toLowerCase()))
      ) return false;
      if (
        requiredKeywords.length &&
        !requiredKeywords.some((kw) => j.title.toLowerCase().includes(kw.toLowerCase()))
      ) return false;
      return true;
    });

    return { output: { ...input, jobs: filtered } as Record<string, unknown> };
  }
}
