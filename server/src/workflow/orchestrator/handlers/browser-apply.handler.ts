import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobApplication, ApplicationStatus } from "@dashboard/entities/job-application.entity";
import type { JobDto } from "@jobs/jobs.dto";
import { NodeSubtype } from "../../entities/workflow-node.entity";
import { NodeHandler } from "../decorators/node-handler.decorator";
import { BaseNodeHandler, NodeExecutionContext, NodeHandlerResult } from "../interfaces/node-handler.interface";
import type { TailorOutput, ApplyOutput } from "../workflow-queue.types";

@NodeHandler(NodeSubtype.SUBMIT_APPLICATION)
@Injectable()
export class BrowserApplyHandler extends BaseNodeHandler {
  private readonly logger = new Logger(BrowserApplyHandler.name);

  get isInline(): boolean {
    return false;
  }

  constructor(
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
  ) {
    super();
  }

  async execute(ctx: NodeExecutionContext): Promise<NodeHandlerResult> {
    const { payload } = ctx;
    const input = payload.input as Partial<TailorOutput & { jobs: JobDto[] }>;

    // Support two upstream shapes:
    //   from AiResumeTailorHandler: { tailoredResume, job }
    //   directly from a filter node: { jobs: JobDto[] }
    let job: JobDto | undefined = input.job;
    if (!job && Array.isArray(input.jobs)) {
      if (input.jobs.length === 0) {
        throw new Error("BROWSER_APPLY: no jobs in input — nothing to apply to");
      }
      job = input.jobs[0];
    }

    if (!job) {
      throw new Error("BROWSER_APPLY: no job in input — cannot create application");
    }

    const tailoredResume = input.tailoredResume;

    this.logger.log(`BROWSER_APPLY: applying to ${job.title} @ ${job.company} for ${payload.userEmail}`);

    // ── TODO: Real browser automation (Puppeteer) goes here ──────────────────
    // For now we create the JobApplication record to track state.
    // When Puppeteer is integrated, this handler will:
    //   1. Launch a headless browser
    //   2. Navigate to job.url
    //   3. Fill the application form using input.tailoredResume
    //   4. Submit and capture confirmation
    // ────────────────────────────────────────────────────────────────────────

    const application = this.applicationRepo.create({
      userEmail: payload.userEmail,
      jobTitle: job.title,
      company: job.company,
      sourceUrl: job.url,
      status: ApplicationStatus.APPLIED,
      workflowRunId: payload.workflowRunId,
      notes: tailoredResume
        ? `[Auto-applied via workflow]\n\nTailored resume:\n${tailoredResume.slice(0, 500)}…`
        : "[Auto-applied via workflow — stub]",
      appliedAt: new Date(),
    });

    const saved = await this.applicationRepo.save(application);

    this.logger.log(`Created JobApplication ${saved.id} for ${job.title} @ ${job.company}`);

    const output: ApplyOutput = { applicationId: saved.id, success: true };
    return { output: output as unknown as Record<string, unknown> };
  }
}
