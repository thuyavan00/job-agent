import { Body, Controller, Get, Post, Patch, Delete, Param, UseGuards } from "@nestjs/common";
import { ResumeService } from "@resume/resume.service";
import { UpsertProfileDto } from "@resume/dto/profile.dto";
import { join } from "path";
import { promises as fs } from "fs";
import { isResume, isCover } from "./file-util";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import type { User } from "@resume/entities/user.entity";

type FileDTO = {
  fileName: string;
  url: string;
  size: number;
  mtimeMs: number;
  ext: string;
  version?: number;
};

@Controller("resume")
@UseGuards(JwtAuthGuard)
export class ResumeController {
  private genRoot = join(process.cwd(), "generated");

  constructor(private readonly service: ResumeService) {}

  @Post("profile")
  upsert(@CurrentUser() user: User, @Body() dto: UpsertProfileDto) {
    return this.service.upsertProfile(user.email, dto);
  }

  @Get("profile")
  get(@CurrentUser() user: User) {
    return this.service.getProfile(user.email);
  }

  @Patch("profile/basics")
  updateBasics(@CurrentUser() user: User, @Body() body: any) {
    return this.service.updateBasics(user.email, body);
  }

  @Get("templates")
  listTemplates() {
    return [{ id: "simple-ats", name: "Simple ATS (A4)" }];
  }

  @Post("render")
  render(
    @CurrentUser() user: User,
    @Body() body: { docType: "resume" | "cover_letter"; templateId: string; variables?: any },
  ) {
    return this.service.renderDocument(user.email, body);
  }

  @Post("tailor")
  async tailor(@Body() body: { resume: string; jd: string }) {
    const tailoredContent = await this.service.tailorResume(body.resume, body.jd);
    return { success: true, data: tailoredContent };
  }

  @Get("files")
  async listFiles(@CurrentUser() user: User): Promise<{ resumes: FileDTO[]; coverLetters: FileDTO[] }> {
    const email = user.email;
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
          url: `${base}/static/${email}/${encodeURIComponent(name)}`,
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
      return {
        resumes: items.filter((f) => isResume(f.fileName)).sort((a, b) => b.mtimeMs - a.mtimeMs),
        coverLetters: items.filter((f) => isCover(f.fileName)).sort((a, b) => b.mtimeMs - a.mtimeMs),
      };
    } catch (e: any) {
      if (e.code === "ENOENT") return { resumes: [], coverLetters: [] };
      throw e;
    }
  }

  @Delete("files/:fileName")
  async deleteFile(@CurrentUser() user: User, @Param("fileName") fileName: string) {
    const full = join(this.genRoot, user.email, fileName);
    try {
      await fs.unlink(full);
      return { ok: true };
    } catch (e: any) {
      if (e.code === "ENOENT") return { ok: true };
      throw e;
    }
  }
}
