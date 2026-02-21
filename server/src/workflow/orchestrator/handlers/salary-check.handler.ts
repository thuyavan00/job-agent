import { Injectable } from "@nestjs/common";
import { NodeSubtype } from "../../entities/workflow-node.entity";
import { NodeHandler } from "../decorators/node-handler.decorator";
import { BaseNodeHandler, NodeExecutionContext, NodeHandlerResult } from "../interfaces/node-handler.interface";

interface SalaryCheckConfig {
  minSalary?: number;
  maxSalary?: number;
}

@NodeHandler(NodeSubtype.SALARY_CHECK)
@Injectable()
export class SalaryCheckHandler extends BaseNodeHandler {
  get isInline(): boolean {
    return true;
  }

  async execute(ctx: NodeExecutionContext): Promise<NodeHandlerResult> {
    const { config, input } = ctx.payload;
    const { minSalary = 0 } = config as SalaryCheckConfig;
    const jobs = (input as any).jobs ?? [];

    // Salary data is often missing from public APIs — pass through if unparseable
    const filtered = jobs.filter((j: any) => {
      const salaryMatch = String(j.salary ?? "").match(/\d+/);
      if (!salaryMatch) return true; // no salary listed → don't filter out
      return Number(salaryMatch[0]) >= Number(minSalary);
    });

    return { output: { ...input, jobs: filtered } as Record<string, unknown> };
  }
}
