import { Controller, Get, UseGuards } from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";

@Controller("jobs")
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  async list() {
    const jobs = await this.service.fetchJobs();
    return { jobs, role: "Software Engineer" };
  }
}
