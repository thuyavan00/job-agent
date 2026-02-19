import { Injectable, Logger } from "@nestjs/common";
import { JobDto } from "./jobs.dto";

/**
 * Greenhouse Job Board API — official, public, no auth.
 * Per-company endpoint: boards-api.greenhouse.io/v1/boards/{token}/jobs
 * No global search: we maintain a curated list of tech companies.
 */
const GREENHOUSE_COMPANIES: Record<string, string> = {
  stripe: "Stripe",
  airbnb: "Airbnb",
  lyft: "Lyft",
  coinbase: "Coinbase",
  discord: "Discord",
  notion: "Notion",
  brex: "Brex",
  gusto: "Gusto",
  coda: "Coda",
  rippling: "Rippling",
};

/**
 * Lever Postings API — official, public, no auth.
 * Per-company endpoint: api.lever.co/v0/postings/{slug}
 */
const LEVER_COMPANIES: Record<string, string> = {
  airtable: "Airtable",
  cloudflare: "Cloudflare",
  linear: "Linear",
  retool: "Retool",
  loom: "Loom",
  reddit: "Reddit",
  intercom: "Intercom",
};

const SW_KEYWORDS = [
  "software",
  "engineer",
  "developer",
  "sde",
  "swe",
  "backend",
  "frontend",
  "full-stack",
  "fullstack",
  "full stack",
  "platform",
  "mobile",
  "ios",
  "android",
];

function isSoftwareRole(title: string): boolean {
  const lower = title.toLowerCase();
  return SW_KEYWORDS.some((kw) => lower.includes(kw));
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  async fetchJobs(): Promise<JobDto[]> {
    const sources = await Promise.allSettled([
      this.fetchRemotive(),
      this.fetchArbeitnow(),
      this.fetchAllGreenhouse(),
      this.fetchAllLever(),
    ]);

    const jobs: JobDto[] = [];
    const names = ["Remotive", "Arbeitnow", "Greenhouse", "Lever"];

    for (let i = 0; i < sources.length; i++) {
      const result = sources[i];
      if (result.status === "fulfilled") {
        jobs.push(...result.value);
      } else {
        this.logger.warn(`${names[i]} fetch failed: ${result.reason}`);
      }
    }

    return jobs;
  }

  // ---------------------------------------------------------------------------
  // Remotive
  // ---------------------------------------------------------------------------

  private async fetchRemotive(): Promise<JobDto[]> {
    const res = await fetch(
      "https://remotive.com/api/remote-jobs?category=software-dev&limit=20",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`Remotive responded ${res.status}`);

    const data = await res.json();
    return (data.jobs ?? []).slice(0, 20).map((j: any): JobDto => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || "Remote",
      type: this.normalizeType(j.job_type),
      descriptionShort: this.truncate(this.stripHtml(j.description), 220),
      url: j.url,
      postedAt: j.publication_date,
      source: "Remotive",
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 6) : [],
    }));
  }

  // ---------------------------------------------------------------------------
  // Arbeitnow
  // ---------------------------------------------------------------------------

  private async fetchArbeitnow(): Promise<JobDto[]> {
    const res = await fetch("https://arbeitnow.com/api/job-board-api?page=1", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Arbeitnow responded ${res.status}`);

    const data = await res.json();
    return (data.data ?? []).slice(0, 20).map((j: any): JobDto => ({
      id: `arbeitnow-${j.slug}`,
      title: j.title,
      company: j.company_name,
      location: j.remote ? "Remote" : (j.location || "Unknown"),
      type: Array.isArray(j.job_types) && j.job_types.length ? j.job_types[0] : "Full-time",
      descriptionShort: this.truncate(this.stripHtml(j.description), 220),
      url: j.url,
      postedAt: new Date(j.created_at * 1000).toISOString(),
      source: "Arbeitnow",
      tags: Array.isArray(j.tags) ? j.tags.slice(0, 6) : [],
    }));
  }

  // ---------------------------------------------------------------------------
  // Greenhouse — fan-out per company, then flatten
  // ---------------------------------------------------------------------------

  private async fetchAllGreenhouse(): Promise<JobDto[]> {
    const results = await Promise.allSettled(
      Object.entries(GREENHOUSE_COMPANIES).map(([token, name]) =>
        this.fetchGreenhouseCompany(token, name),
      ),
    );

    return results.flatMap((r) => {
      if (r.status === "fulfilled") return r.value;
      this.logger.warn(`Greenhouse company failed: ${r.reason}`);
      return [];
    });
  }

  private async fetchGreenhouseCompany(token: string, companyName: string): Promise<JobDto[]> {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) throw new Error(`Greenhouse/${token} responded ${res.status}`);

    const data = await res.json();
    return (data.jobs ?? [])
      .filter((j: any) => isSoftwareRole(j.title))
      .slice(0, 5)
      .map((j: any): JobDto => ({
        id: `greenhouse-${j.id}`,
        title: j.title,
        company: companyName,
        location: j.location?.name || "See posting",
        type: "Full-time",
        descriptionShort: this.truncate(this.stripHtml(j.content ?? ""), 220),
        url: j.absolute_url,
        postedAt: j.updated_at,
        source: "Greenhouse",
        tags: (j.departments ?? []).map((d: any) => d.name).slice(0, 4),
      }));
  }

  // ---------------------------------------------------------------------------
  // Lever — fan-out per company, then flatten
  // ---------------------------------------------------------------------------

  private async fetchAllLever(): Promise<JobDto[]> {
    const results = await Promise.allSettled(
      Object.entries(LEVER_COMPANIES).map(([slug, name]) =>
        this.fetchLeverCompany(slug, name),
      ),
    );

    return results.flatMap((r) => {
      if (r.status === "fulfilled") return r.value;
      this.logger.warn(`Lever company failed: ${r.reason}`);
      return [];
    });
  }

  private async fetchLeverCompany(slug: string, companyName: string): Promise<JobDto[]> {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) throw new Error(`Lever/${slug} responded ${res.status}`);

    const data: any[] = await res.json();
    return data
      .filter((j) => isSoftwareRole(j.text))
      .slice(0, 5)
      .map((j): JobDto => ({
        id: `lever-${j.id}`,
        title: j.text,
        company: companyName,
        location:
          j.categories?.location ||
          (j.workplaceType === "remote" ? "Remote" : "See posting"),
        type: j.categories?.commitment || "Full-time",
        descriptionShort: this.truncate(
          j.descriptionPlain || this.stripHtml(j.description ?? ""),
          220,
        ),
        url: j.hostedUrl,
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
        source: "Lever",
        tags: [j.categories?.team, j.categories?.department]
          .filter(Boolean)
          .slice(0, 4) as string[],
      }));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private stripHtml(html: string): string {
    return (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  private normalizeType(raw: string): string {
    const map: Record<string, string> = {
      full_time: "Full-time",
      part_time: "Part-time",
      contract: "Contract",
      freelance: "Freelance",
      internship: "Internship",
    };
    return map[raw] ?? raw ?? "Full-time";
  }
}
