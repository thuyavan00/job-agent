import { Injectable, Logger } from "@nestjs/common";
import { JobsService } from "@jobs/jobs.service";
import { NodeSubtype } from "../../entities/workflow-node.entity";
import { NodeHandler } from "../decorators/node-handler.decorator";
import { BaseNodeHandler, NodeExecutionContext, NodeHandlerResult } from "../interfaces/node-handler.interface";
import type { TriggerOutput } from "../workflow-queue.types";

/** config.portal (new_job_posted node) → JobDto.source */
const PORTAL_TO_SOURCE: Record<string, string> = {
  remotive:   "Remotive",
  arbeitnow:  "Arbeitnow",
  greenhouse: "Greenhouse",
  lever:      "Lever",
};

/** Specific-portal subtypes → JobDto.source (no config.portal needed) */
const SUBTYPE_TO_SOURCE: Partial<Record<NodeSubtype, string>> = {
  [NodeSubtype.REMOTIVE_JOBS]:   "Remotive",
  [NodeSubtype.ARBEITNOW_JOBS]:  "Arbeitnow",
  [NodeSubtype.GREENHOUSE_JOBS]: "Greenhouse",
  [NodeSubtype.LEVER_JOBS]:      "Lever",
};

interface TriggerConfig {
  // new_job_posted — user explicitly picks portal
  portal?: string;
  // shared across all portal types
  keywords?: string | string[];
  location?: string;
  remoteOnly?: boolean;
  // greenhouse_jobs / lever_jobs — filter by company name
  companies?: string[];
}

@NodeHandler(
  NodeSubtype.NEW_JOB_POSTED,
  NodeSubtype.REMOTIVE_JOBS,
  NodeSubtype.ARBEITNOW_JOBS,
  NodeSubtype.GREENHOUSE_JOBS,
  NodeSubtype.LEVER_JOBS,
  NodeSubtype.DAILY_TRIGGER,
  NodeSubtype.WEEKLY_TRIGGER,
)
@Injectable()
export class TriggerJobMatchHandler extends BaseNodeHandler {
  private readonly logger = new Logger(TriggerJobMatchHandler.name);

  get isInline(): boolean {
    return false;
  }

  constructor(private readonly jobsService: JobsService) {
    super();
  }

  async execute(ctx: NodeExecutionContext): Promise<NodeHandlerResult> {
    const { payload } = ctx;
    const config = payload.config as TriggerConfig;
    const subtype = payload.subtype as NodeSubtype;

    // Resolve which source to filter by:
    // 1. Specific-portal subtypes (remotive_jobs etc.) → inferred from subtype
    // 2. new_job_posted → must have config.portal set by user
    const sourceFilter =
      SUBTYPE_TO_SOURCE[subtype] ??
      (config.portal ? PORTAL_TO_SOURCE[config.portal] : null);

    // Normalise keywords — UI stores as comma-separated string or array
    const rawKeywords = Array.isArray(config.keywords)
      ? config.keywords
      : (config.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    const keywords = rawKeywords.map((k) => k.toLowerCase());

    const locationFilter = (config.location ?? "").toLowerCase();
    const companyFilter = (config.companies ?? []).map((c) => c.toLowerCase());

    this.logger.log(
      `Fetching jobs — source: "${sourceFilter ?? "all"}" ` +
      `keywords: [${keywords.join(", ")}] ` +
      `location: "${locationFilter}" ` +
      `companies: [${companyFilter.join(", ")}]`,
    );

    const allJobs = await this.jobsService.fetchJobs();

    const filtered = allJobs.filter((job) => {
      if (sourceFilter && job.source !== sourceFilter) return false;

      if (
        companyFilter.length > 0 &&
        !companyFilter.some((c) => job.company.toLowerCase().includes(c))
      ) return false;

      const titleLower = job.title.toLowerCase();
      const jobLocation = job.location.toLowerCase();

      const keywordMatch =
        keywords.length === 0 ||
        keywords.some(
          (kw) => titleLower.includes(kw) || job.tags.some((t) => t.toLowerCase().includes(kw)),
        );

      const locationMatch =
        !locationFilter ||
        jobLocation.includes(locationFilter) ||
        (config.remoteOnly && jobLocation.includes("remote"));

      return keywordMatch && locationMatch;
    });

    this.logger.log(
      `TRIGGER_JOB_MATCH: found ${filtered.length} / ${allJobs.length} matching jobs`,
    );

    const output: TriggerOutput = { jobs: filtered };
    return { output: output as unknown as Record<string, unknown> };
  }
}
