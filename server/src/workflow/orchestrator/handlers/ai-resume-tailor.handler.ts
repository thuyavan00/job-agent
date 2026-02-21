import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { spawn } from "child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { Profile } from "@resume/entities/profile.entity";
import { JobDto } from "@jobs/jobs.dto";
import { NodeSubtype } from "../../entities/workflow-node.entity";
import { NodeHandler } from "../decorators/node-handler.decorator";
import { BaseNodeHandler, NodeExecutionContext, NodeHandlerResult } from "../interfaces/node-handler.interface";
import type { TriggerOutput, TailorOutput } from "../workflow-queue.types";

interface TailorConfig {
  resumeProfileId?: string;
}

@NodeHandler(NodeSubtype.TAILOR_RESUME)
@Injectable()
export class AiResumeTailorHandler extends BaseNodeHandler {
  private readonly logger = new Logger(AiResumeTailorHandler.name);

  get isInline(): boolean {
    return false;
  }

  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {
    super();
  }

  async execute(ctx: NodeExecutionContext): Promise<NodeHandlerResult> {
    const { payload } = ctx;
    const config = payload.config as TailorConfig;
    const input = payload.input as Partial<TriggerOutput>;

    const jobs: JobDto[] = input.jobs ?? [];
    if (jobs.length === 0) {
      throw new Error("AI_RESUME_TAILOR: no jobs in input — nothing to tailor for");
    }

    // Use the first job as the target for this tailoring pass
    const targetJob = jobs[0];

    // ── Fetch the user's profile ────────────────────────────────────────────
    const profileId = config.resumeProfileId;
    let profileText: string;

    if (profileId) {
      const profile = await this.profileRepo.findOne({ where: { id: profileId } });
      if (!profile) throw new Error(`Profile ${profileId} not found`);
      profileText = this.profileToText(profile);
    } else {
      // Fallback: use whatever profile belongs to this user (first found via userEmail match in basics)
      this.logger.warn("No resumeProfileId in config — searching by userEmail");
      const profile = await this.profileRepo
        .createQueryBuilder("p")
        .where("p.basics->>'email' = :email", { email: payload.userEmail })
        .getOne();
      if (!profile) throw new Error(`No profile found for ${payload.userEmail}`);
      profileText = this.profileToText(profile);
    }

    const jdText = [
      `Job Title: ${targetJob.title}`,
      `Company: ${targetJob.company}`,
      `Location: ${targetJob.location}`,
      `Description: ${targetJob.descriptionShort}`,
    ].join("\n");

    this.logger.log(`Tailoring resume for: ${targetJob.title} @ ${targetJob.company}`);

    const tailoredResume = await this.spawnTailorAgent(profileText, jdText);

    const output: TailorOutput = { tailoredResume, job: targetJob };
    return { output: output as unknown as Record<string, unknown> };
  }

  // ── Python bridge — mirrors resume.service.ts tailorResume() ───────────────

  private spawnTailorAgent(resumeText: string, jdText: string): Promise<string> {
    const pythonProjectDir = process.env.AGENT_PATH;

    if (!pythonProjectDir || !fs.existsSync(pythonProjectDir)) {
      throw new Error(`AGENT_PATH not set or missing: "${pythonProjectDir}"`);
    }
    const scriptPath = path.join(pythonProjectDir, "main.py");
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`main.py not found at ${scriptPath}`);
    }

    return new Promise((resolve, reject) => {
      const proc = spawn("/usr/bin/uv", ["run", "main.py"], {
        cwd: pythonProjectDir,
        shell: true,
        env: { ...process.env, PATH: process.env.PATH },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (d) => { stdout += d.toString(); });
      proc.stderr.on("data", (d) => { stderr += d.toString(); });

      proc.on("error", reject);

      proc.on("close", (code) => {
        if (code !== 0) {
          this.logger.error(`main.py exited ${code}: ${stderr}`);
          return reject(new Error(`Python agent exited with code ${code}: ${stderr}`));
        }
        resolve(stdout.trim());
      });

      proc.stdin.write(JSON.stringify({ resume: resumeText, jd: jdText }));
      proc.stdin.end();
    });
  }

  // ── Convert Profile entity → markdown text for the Python agent ────────────

  private profileToText(profile: Profile): string {
    const parts: string[] = [];
    const b = profile.basics as any;

    if (b) {
      parts.push(`# ${b.fullName ?? "Resume"}`);
      if (b.email) parts.push(`Email: ${b.email}`);
      if (b.phone) parts.push(`Phone: ${b.phone}`);
      if (b.location) parts.push(`Location: ${b.location}`);
      if (b.summary) parts.push(`\n## Summary\n${b.summary}`);
    }

    const experience = (profile.experience as any[]) ?? [];
    if (experience.length) {
      parts.push("\n## Experience");
      for (const exp of experience) {
        const end = exp.endDate || "Present";
        parts.push(`\n### ${exp.jobTitle} at ${exp.company} (${exp.startDate} – ${end})`);
        for (const bullet of exp.bullets ?? []) {
          parts.push(`- ${bullet}`);
        }
      }
    }

    const education = (profile.education as any[]) ?? [];
    if (education.length) {
      parts.push("\n## Education");
      for (const edu of education) {
        parts.push(`- ${edu.degree} at ${edu.institution} (${edu.startDate} – ${edu.endDate})`);
      }
    }

    const projects = (profile.projects as any[]) ?? [];
    if (projects.length) {
      parts.push("\n## Projects");
      for (const proj of projects) {
        parts.push(`\n### ${proj.title}`);
        if (proj.description) parts.push(proj.description);
        if (proj.technologies?.length) parts.push(`Technologies: ${proj.technologies.join(", ")}`);
      }
    }

    const skills = (profile.skills as any)?.items ?? [];
    if (skills.length) {
      parts.push(`\n## Skills\n${skills.join(", ")}`);
    }

    return parts.join("\n");
  }
}
