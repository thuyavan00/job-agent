import { ApplicationStatus } from "./entities/job-application.entity";
import { PrepStatus } from "./entities/interview.entity";

export interface StatCard {
  value: number | string;
  change: number;
}

export interface DashboardStats {
  applicationsSent: StatCard;
  interviewsScheduled: StatCard;
  responseRate: StatCard;
  successRate: StatCard;
}

export interface OverviewDataPoint {
  month: string;
  applications: number;
  interviews: number;
}

export interface RecentApplication {
  id: string;
  jobTitle: string;
  company: string;
  salary: string | null;
  status: ApplicationStatus;
  appliedAt: Date;
}

export interface UpcomingInterview {
  id: string;
  jobTitle: string;
  company: string;
  scheduledAt: Date;
  prepStatus: PrepStatus;
  initials: string;
}

export interface DashboardData {
  stats: DashboardStats;
  overview: OverviewDataPoint[];
  recentApplications: RecentApplication[];
  upcomingInterviews: UpcomingInterview[];
}

export class CreateApplicationDto {
  jobTitle: string;
  company: string;
  salary?: string;
  status?: ApplicationStatus;
  notes?: string;
  sourceUrl?: string;
  appliedAt?: string;
}

export class CreateInterviewDto {
  jobTitle: string;
  company: string;
  scheduledAt: string;
  prepStatus?: PrepStatus;
  notes?: string;
}
