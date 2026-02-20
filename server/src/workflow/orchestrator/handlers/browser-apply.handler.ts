import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobApplication, ApplicationStatus } from "@dashboard/entities/job-application.entity";
import { WorkflowJobPayload, TailorOutput, ApplyOutput } from "../workflow-queue.types";

@Injectable()
export class BrowserApplyHandler {
  private readonly logger = new Logger(BrowserApplyHandler.name);

  constructor(
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
  ) {}

  async handle(payload: WorkflowJobPayload): Promise<ApplyOutput> {
    const input = payload.input as Partial<TailorOutput>;
    const job = input.job;

    if (!job) {
      throw new Error("BROWSER_APPLY: no job in input — cannot create application");
    }

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
      notes: input.tailoredResume
        ? `[Auto-applied via workflow]\n\nTailored resume:\n${(input.tailoredResume as string).slice(0, 500)}…`
        : "[Auto-applied via workflow — stub]",
      appliedAt: new Date(),
    });

    const saved = await this.applicationRepo.save(application);

    this.logger.log(`Created JobApplication ${saved.id} for ${job.title} @ ${job.company}`);

    return { applicationId: saved.id, success: true };
  }
}
