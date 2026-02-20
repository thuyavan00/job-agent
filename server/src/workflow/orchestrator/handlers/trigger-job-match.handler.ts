import { Injectable, Logger } from "@nestjs/common";
import { JobsService } from "@jobs/jobs.service";
import { WorkflowJobPayload, TriggerOutput } from "../workflow-queue.types";

interface TriggerConfig {
  keywords?: string[];
  location?: string;
  remote?: boolean;
}

@Injectable()
export class TriggerJobMatchHandler {
  private readonly logger = new Logger(TriggerJobMatchHandler.name);

  constructor(private readonly jobsService: JobsService) {}

  async handle(payload: WorkflowJobPayload): Promise<TriggerOutput> {
    const config = payload.config as TriggerConfig;
    const keywords = (config.keywords ?? []).map((k) => k.toLowerCase());
    const locationFilter = (config.location ?? "").toLowerCase();

    this.logger.log(`Fetching jobs — keywords: [${keywords.join(", ")}] location: "${locationFilter}"`);

    const allJobs = await this.jobsService.fetchJobs();

    const filtered = allJobs.filter((job) => {
      const titleLower = job.title.toLowerCase();
      const jobLocation = job.location.toLowerCase();

      const keywordMatch =
        keywords.length === 0 || keywords.some((kw) => titleLower.includes(kw) || job.tags.some((t) => t.toLowerCase().includes(kw)));

      const locationMatch =
        !locationFilter ||
        locationFilter === "" ||
        jobLocation.includes(locationFilter) ||
        (config.remote && jobLocation.includes("remote"));

      return keywordMatch && locationMatch;
    });

    this.logger.log(`TRIGGER_JOB_MATCH: found ${filtered.length} / ${allJobs.length} matching jobs`);

    return { jobs: filtered };
  }
}
