import { Injectable, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as path from "node:path";
import * as fsys from "node:fs/promises";
import Handlebars from "handlebars";
import * as puppeteer from "puppeteer";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { User } from "./entities/user.entity";
import { Profile } from "@resume/entities/profile.entity";
import { UpsertProfileDto } from "./dto/profile.dto";
import { spawn } from "child_process";
import * as fs from "node:fs";
type RenderInput = {
  docType: "resume" | "cover_letter";
  templateId: string; // "simple-ats"
  variables?: Record<string, any>; // for cover letter (company, job_title, etc.)
};

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Profile) private profiles: Repository<Profile>,
  ) {}

  async upsertProfile(email: string, dto: UpsertProfileDto): Promise<Profile> {
    // 1. Look up user (with profile)
    let user = await this.users.findOne({ where: { email }, relations: ["profile"] });
    if (!user) {
      user = await this.users.save(this.users.create({ email }));
    }

    // 2. Normalize input → entity shape
    const cleanStr = (v?: string) => (v && v.trim().length ? v.trim() : undefined);

    const normalized: Partial<Profile> = {
      basics: {
        ...dto.basics,
        phone: cleanStr(dto.basics.phone),
        location: cleanStr(dto.basics.location),
        linkedIn: cleanStr(dto.basics.linkedIn),
        github: cleanStr(dto.basics.github),
        website: cleanStr(dto.basics.website),
        summary: cleanStr(dto.basics.summary),
      },
      education: (dto.education ?? []).map((e) => ({
        ...e,
        location: cleanStr(e.location),
      })),
      experience: (dto.experience ?? []).map((e) => ({
        ...e,
        location: cleanStr(e.location),
        endDate: cleanStr(e.endDate), // "" or undefined => template shows “Present”
        bullets: (e.bullets ?? []).filter(Boolean),
      })),
      projects: (dto.projects ?? []).map((p) => ({
        ...p,
        liveDemoUrl: cleanStr(p.liveDemoUrl),
        repoUrl: cleanStr(p.repoUrl),
        technologies: (p.technologies ?? []).filter(Boolean),
      })),
      // 👇 This matches your new entity
      skills: {
        items: Array.isArray(dto.skills?.items) ? dto.skills.items.filter(Boolean) : [],
      },
      user,
    };

    // 3. Insert or update profile
    if (!user.profile) {
      user.profile = await this.profiles.save(this.profiles.create(normalized));
    } else {
      await this.profiles.update(user.profile.id, normalized);
      user.profile = await this.profiles.findOneByOrFail({ id: user.profile.id });
    }

    // 4. Ensure consistent return (if old rows had array-style skills)
    if (Array.isArray((user.profile as any).skills)) {
      (user.profile as any).skills = { items: (user.profile as any).skills };
    }

    return user.profile;
  }

  async getProfile(email: string): Promise<Profile> {
    const user = await this.users.findOne({ where: { email }, relations: ["profile"] });
    if (!user?.profile) throw new NotFoundException("Profile not found");

    // normalize skills on read too
    if (Array.isArray((user.profile as any).skills)) {
      (user.profile as any).skills = { items: (user.profile as any).skills };
    }

    return user.profile;
  }

  // --- Templates directory layout (MVP):
  // templates/
  //   simple-ats/
  //     resume.hbs
  //     cover.hbs
  //     assets/... (optional)
  private templatePath(templateId: string, name: "resume" | "cover") {
    return path.join(process.cwd(), "templates", templateId, `${name}.hbs`);
  }

  async renderHTML(templateId: string, name: "resume" | "cover", context: any) {
    const file = this.templatePath(templateId, name);
    const src = await fsys.readFile(file, "utf8");
    const tpl = Handlebars.compile(src, { noEscape: true });
    return tpl(context);
  }

  async renderPDF(html: string, outPath: string) {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.pdf({ path: outPath, format: "A4", printBackground: true });
    } finally {
      await browser.close();
    }
  }

  async renderDOCX(profile: any, outPath: string) {
    // Extremely simple DOCX; you’ll enhance later or swap to docxtemplater
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: profile.basics.fullName, bold: true, size: 32 })],
            }),
            new Paragraph({
              text: `${profile.basics.title} · ${profile.basics.email} · ${profile.basics.phone ?? ""}`,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Experience", heading: "Heading1" }),
            ...profile.experience.flatMap((e) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${e.role} — ${e.company} (${e.start} – ${e.end})`,
                    bold: true,
                  }),
                ],
              }),
              ...e.bullets.map((b: string) => new Paragraph({ text: `• ${b}` })),
              new Paragraph({ text: "" }),
            ]),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    await fsys.writeFile(outPath, buffer);
  }

  async renderDocument(email: string, input: RenderInput) {
    const profile = await this.getProfile(email);
    const outDir = path.join(process.cwd(), "generated", email.replace(/[^a-zA-Z0-9@.]/g, "_"));
    await fsys.mkdir(outDir, { recursive: true });
    const base = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";

    // Add a version number to the file name to prevent caching
    const version = Date.now();

    if (input.docType === "resume") {
      // HTML -> PDF
      const html = await this.renderHTML(input.templateId, "resume", { profile });
      const pdfPath = path.join(outDir, `resume-${input.templateId}-v${version}.pdf`);
      await this.renderPDF(html, pdfPath);

      // quick DOCX too
      const docxPath = path.join(outDir, `resume-${input.templateId}-v${version}.docx`);
      await this.renderDOCX(profile, docxPath);

      return {
        pdfUrl: `${base}/static${pdfPath.split("generated")[1]}`,
        docxUrl: `${base}/static${docxPath.split("generated")[1]}`,
      };
    }

    // cover letter
    const ctx = { profile, vars: input.variables ?? {} };
    const html = await this.renderHTML(input.templateId, "cover", ctx);
    const pdfPath = path.join(outDir, `cover-${input.templateId}-v${version}.pdf`);
    await this.renderPDF(html, pdfPath);
    return { pdfUrl: `${base}/static${pdfPath.split("generated")[1]}` };
  }

  async tailorResume(resumeText: string, jdText: string): Promise<string> {
    const pythonProjectDir = process.env.AGENT_PATH;
    if (!pythonProjectDir || !fs.existsSync(pythonProjectDir)) {
      throw new Error(`AGENT_PATH directory not found: ${pythonProjectDir}`);
    }

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn("/usr/bin/uv", ["run", "main.py"], {
        cwd: pythonProjectDir,
        shell: true,
        env: {
          ...process.env, // This ensures PATH is passed through
          PATH: process.env.PATH,
        },
      });

      let result = "";
      let errorData = "";

      // Capture the output
      pythonProcess.stdout.on("data", (data) => {
        result += data.toString();
      });

      // Capture errors
      pythonProcess.stderr.on("data", (data) => {
        errorData += data.toString();
      });

      pythonProcess.on("error", (err) => {
        console.error("Spawn Error Detail:", err);
        reject(err);
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error(`Python Error: ${errorData}`);
          return reject(new InternalServerErrorException("Agent failed to process resume"));
        }
        resolve(result);
      });

      // Send the data to Python as a JSON string
      const inputData = JSON.stringify({ resume: resumeText, jd: jdText });
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();
    });
  }
}
