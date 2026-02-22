import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Interview, PrepStatus } from "../dashboard/entities/interview.entity";
import { CreateInterviewDto, GetInterviewsQueryDto, UpdateInterviewDto } from "./interviews.dto";

@Injectable()
export class InterviewsService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
  ) {}

  async getInterviews(userEmail: string, query: GetInterviewsQueryDto): Promise<Interview[]> {
    const qb = this.interviewRepo
      .createQueryBuilder("i")
      .where("i.userEmail = :userEmail", { userEmail })
      .orderBy("i.scheduledAt", "ASC");

    // Note: dates are treated as UTC. Clients must send UTC ISO strings for consistent comparison.
    if (query.from) {
      qb.andWhere("i.scheduledAt >= :from", { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere("i.scheduledAt <= :to", { to: new Date(query.to) });
    }

    return qb.getMany();
  }

  async createInterview(userEmail: string, dto: CreateInterviewDto): Promise<Interview> {
    const interview = this.interviewRepo.create({
      userEmail,
      jobTitle: dto.jobTitle,
      company: dto.company,
      scheduledAt: new Date(dto.scheduledAt),
      prepStatus: dto.prepStatus ?? PrepStatus.PREP_PENDING,
      notes: dto.notes,
    });
    return this.interviewRepo.save(interview);
  }

  async updateInterview(
    id: string,
    userEmail: string,
    dto: UpdateInterviewDto,
  ): Promise<Interview> {
    // Combined ownership + existence check. 404 in both cases to avoid leaking resource existence.
    const interview = await this.interviewRepo.findOne({ where: { id, userEmail } });
    if (!interview) throw new NotFoundException("Interview not found");

    // TODO: enforce forward-only prepStatus transitions if product requirements mandate it.
    Object.assign(interview, {
      ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
      ...(dto.company !== undefined && { company: dto.company }),
      ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
      ...(dto.prepStatus !== undefined && { prepStatus: dto.prepStatus }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    return this.interviewRepo.save(interview);
  }

  async deleteInterview(id: string, userEmail: string): Promise<void> {
    const interview = await this.interviewRepo.findOne({ where: { id, userEmail } });
    if (!interview) throw new NotFoundException("Interview not found");
    await this.interviewRepo.remove(interview);
  }
}
