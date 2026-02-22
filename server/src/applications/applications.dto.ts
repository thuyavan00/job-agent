import { ApplicationStatus } from "../dashboard/entities/job-application.entity";

export class CreateApplicationDto {
  jobTitle: string;
  company: string;
  location?: string;
  salary?: string;
  status?: ApplicationStatus;
  notes?: string;
  sourceUrl?: string;
  source?: string;
  nextAction?: string;
  nextActionDate?: string;
  appliedAt?: string;
}

export class UpdateApplicationDto {
  jobTitle?: string;
  company?: string;
  location?: string;
  salary?: string;
  status?: ApplicationStatus;
  notes?: string;
  sourceUrl?: string;
  source?: string;
  nextAction?: string;
  nextActionDate?: string;
  appliedAt?: string;
}

export class GetApplicationsQueryDto {
  search?: string;
  status?: ApplicationStatus;
}
