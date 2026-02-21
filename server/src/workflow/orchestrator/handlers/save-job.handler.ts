import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobApplication, ApplicationStatus } from "@dashboard/entities/job-application.entity";
import { NodeSubtype } from "../../entities/workflow-node.entity";
import { NodeHandler } from "../decorators/node-handler.decorator";
import { BaseNodeHandler, NodeExecutionContext, NodeHandlerResult } from "../interfaces/node-handler.interface";

interface SaveJobConfig {
  defaultStatus?: "applied" | "interview" | "offer";
}

@NodeHandler(NodeSubtype.SAVE_JOB)
@Injectable()
export class SaveJobHandler extends BaseNodeHandler {
  private readonly logger = new Logger(SaveJobHandler.name);

  get isInline(): boolean {
    return true;
  }

  constructor(
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
  ) {
    super();
  }

  async execute(ctx: NodeExecutionContext): Promise<NodeHandlerResult> {
    const { payload } = ctx;
    const config = payload.config as SaveJobConfig;
    const jobs = (payload.input as any).jobs ?? [];

    const statusMap: Record<string, ApplicationStatus> = {
      applied:   ApplicationStatus.APPLIED,
      interview: ApplicationStatus.INTERVIEW,
      offer:     ApplicationStatus.OFFER,
    };
    const status = statusMap[config.defaultStatus ?? "applied"] ?? ApplicationStatus.APPLIED;

    const savedIds: string[] = [];
    for (const job of jobs) {
      const application = this.applicationRepo.create({
        userEmail: payload.userEmail,
        jobTitle: job.title,
        company: job.company,
        sourceUrl: job.url,
        status,
        workflowRunId: payload.workflowRunId,
        notes: "[Saved via workflow]",
        appliedAt: new Date(),
      });
      const saved = await this.applicationRepo.save(application);
      savedIds.push(saved.id);
      this.logger.log(`Saved job: ${job.title} @ ${job.company} (${saved.id})`);
    }

    return {
      output: {
        ...payload.input,
        savedApplicationIds: savedIds,
      } as Record<string, unknown>,
    };
  }
}
