import { Body, Controller, Get, Headers, Post, Delete, Param } from "@nestjs/common";
import { ResumeService } from "@resume/resume.service";
import { UpsertProfileDto } from "@resume/dto/profile.dto";
import { join } from "path";
import { promises as fs } from "fs";
import { isResume, isCover } from "./file-util";

const userFrom = (headers: Record<string, string>) => headers["x-user-email"] || "demo@local";
type FileDTO = {
  fileName: string;
  url: string; // /static/<safeEmail>/<fileName>
  size: number;
  mtimeMs: number;
  ext: string; // pdf | docx
  version?: number; // parsed from -v12345 (optional, for convenience)
};

@Controller("resume")
export class ResumeController {
  private genRoot = join(process.cwd(), "generated");
  private staticRoot = "static"; // must match ServeStatic serveRoot

  constructor(private readonly service: ResumeService) {}

  @Post("profile")
  upsert(@Headers() headers: any, @Body() dto: UpsertProfileDto) {
    const email = userFrom(headers);
    return this.service.upsertProfile(email, dto);
  }

  @Get("profile")
  get(@Headers() headers: any) {
    return this.service.getProfile(userFrom(headers));
  }

  @Get("templates")
  listTemplates() {
    // Hardcode for MVP; later read directory
    return [{ id: "simple-ats", name: "Simple ATS (A4)" }];
  }

  @Post("render")
  render(
    @Headers() headers: any,
    @Body() body: { docType: "resume" | "cover_letter"; templateId: string; variables?: any },
  ) {
    const email = userFrom(headers);
    return this.service.renderDocument(email, body);
  }

  @Get("files")
  async listFiles(
    @Headers("x-user-email") email: string,
  ): Promise<{ resumes: FileDTO[]; coverLetters: FileDTO[] }> {
    if (!email) return { resumes: [], coverLetters: [] };

    const dir = join(this.genRoot, email);
    const base = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";

    async function statIfFile(name: string): Promise<FileDTO | null> {
      const full = join(dir, name);
      try {
        const st = await fs.stat(full);
        if (!st.isFile()) return null;
        const ext = name.split(".").pop()?.toLowerCase() || "";
        if (!["pdf", "docx"].includes(ext)) return null;
        const match = name.match(/-v(\d+)\.(pdf|docx)$/i);
        const version = match ? Number(match[1]) : undefined;
        return {
          fileName: name,
          url: `${base}/${"static"}/${email}/${encodeURIComponent(name)}`,
          size: st.size,
          mtimeMs: st.mtimeMs,
          ext,
          version,
        };
      } catch (e: any) {
        if (e.code === "ENOENT") return null;
        throw e;
      }
    }

    try {
      const names = await fs.readdir(dir);
      const items = (await Promise.all(names.map(statIfFile))).filter(Boolean) as FileDTO[];

      const resumes = items
        .filter((f) => isResume(f.fileName))
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
      const coverLetters = items
        .filter((f) => isCover(f.fileName))
        .sort((a, b) => b.mtimeMs - a.mtimeMs);

      return { resumes, coverLetters };
    } catch (e: any) {
      if (e.code === "ENOENT") return { resumes: [], coverLetters: [] }; // folder not created yet
      throw e;
    }
  }

  @Delete("files/:fileName")
  async deleteFile(@Headers("x-user-email") email: string, @Param("fileName") fileName: string) {
    if (!email || !fileName) return { ok: false };

    const full = join(this.genRoot, email, fileName);
    try {
      await fs.unlink(full);
      return { ok: true };
    } catch (e: any) {
      if (e.code === "ENOENT") return { ok: true }; // already gone
      throw e;
    }
  }
}
