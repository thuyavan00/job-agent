import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobApplication, ApplicationStatus } from "../dashboard/entities/job-application.entity";
import { CreateApplicationDto, UpdateApplicationDto } from "./applications.dto";

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
  ) {}

  async getApplications(
    userEmail: string,
    search?: string,
    status?: ApplicationStatus,
  ): Promise<JobApplication[]> {
    const qb = this.appRepo
      .createQueryBuilder("a")
      .where("a.userEmail = :userEmail", { userEmail })
      .orderBy("a.appliedAt", "DESC");

    if (status) {
      qb.andWhere("a.status = :status", { status });
    }

    if (search) {
      qb.andWhere("(LOWER(a.company) LIKE :q OR LOWER(a.jobTitle) LIKE :q)", {
        q: `%${search.toLowerCase()}%`,
      });
    }

    return qb.getMany();
  }

  async createApplication(
    userEmail: string,
    dto: CreateApplicationDto,
  ): Promise<JobApplication> {
    const app = this.appRepo.create({
      userEmail,
      jobTitle: dto.jobTitle,
      company: dto.company,
      location: dto.location,
      salary: dto.salary,
      status: dto.status ?? ApplicationStatus.APPLIED,
      notes: dto.notes,
      sourceUrl: dto.sourceUrl,
      source: dto.source,
      nextAction: dto.nextAction,
      nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : undefined,
      appliedAt: dto.appliedAt ? new Date(dto.appliedAt) : new Date(),
    });
    return this.appRepo.save(app);
  }

  async updateApplication(
    id: string,
    userEmail: string,
    dto: UpdateApplicationDto,
  ): Promise<JobApplication> {
    const app = await this.appRepo.findOne({ where: { id, userEmail } });
    if (!app) throw new NotFoundException("Application not found");

    Object.assign(app, {
      ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
      ...(dto.company !== undefined && { company: dto.company }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.salary !== undefined && { salary: dto.salary }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.sourceUrl !== undefined && { sourceUrl: dto.sourceUrl }),
      ...(dto.source !== undefined && { source: dto.source }),
      ...(dto.nextAction !== undefined && { nextAction: dto.nextAction }),
      ...(dto.nextActionDate !== undefined && {
        nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : null,
      }),
      ...(dto.appliedAt !== undefined && { appliedAt: new Date(dto.appliedAt) }),
    });

    return this.appRepo.save(app);
  }

  async deleteApplication(id: string, userEmail: string): Promise<void> {
    const app = await this.appRepo.findOne({ where: { id, userEmail } });
    if (!app) throw new NotFoundException("Application not found");
    await this.appRepo.remove(app);
  }
}
