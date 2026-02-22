import { PrepStatus } from "../dashboard/entities/interview.entity";

export class CreateInterviewDto {
  jobTitle: string;
  company: string;
  scheduledAt: string;
  prepStatus?: PrepStatus;
  notes?: string;
}

export class GetInterviewsQueryDto {
  from?: string;
  to?: string;
}

export class UpdateInterviewDto {
  jobTitle?: string;
  company?: string;
  scheduledAt?: string;
  prepStatus?: PrepStatus;
  notes?: string;
}
