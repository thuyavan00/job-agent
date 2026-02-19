import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual } from "typeorm";
import { JobApplication, ApplicationStatus } from "./entities/job-application.entity";
import { Interview, PrepStatus } from "./entities/interview.entity";
import {
  DashboardData,
  DashboardStats,
  OverviewDataPoint,
  CreateApplicationDto,
  CreateInterviewDto,
} from "./dashboard.dto";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly appRepo: Repository<JobApplication>,
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
  ) {}

  async getDashboardData(userEmail: string): Promise<DashboardData> {
    const [stats, overview, recentApplications, upcomingInterviews] = await Promise.all([
      this.getStats(userEmail),
      this.getOverview(userEmail),
      this.getRecentApplications(userEmail),
      this.getUpcomingInterviews(userEmail),
    ]);

    return { stats, overview, recentApplications, upcomingInterviews };
  }

  private async getStats(userEmail: string): Promise<DashboardStats> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [totalApps, recentApps, prevApps, totalInterviews, recentInterviews, prevInterviews, offers] =
      await Promise.all([
        this.appRepo.count({ where: { userEmail } }),
        this.appRepo.count({ where: { userEmail, appliedAt: MoreThanOrEqual(thirtyDaysAgo) } }),
        this.appRepo.count({
          where: { userEmail, appliedAt: MoreThanOrEqual(sixtyDaysAgo) },
        }),
        this.interviewRepo.count({ where: { userEmail } }),
        this.interviewRepo.count({
          where: { userEmail, scheduledAt: MoreThanOrEqual(thirtyDaysAgo) },
        }),
        this.interviewRepo.count({
          where: { userEmail, scheduledAt: MoreThanOrEqual(sixtyDaysAgo) },
        }),
        this.appRepo.count({ where: { userEmail, status: ApplicationStatus.OFFER } }),
      ]);

    const prevOnlyApps = prevApps - recentApps;
    const appChange = prevOnlyApps > 0 ? Math.round(((recentApps - prevOnlyApps) / prevOnlyApps) * 100) : 0;

    const prevOnlyInterviews = prevInterviews - recentInterviews;
    const interviewChange =
      prevOnlyInterviews > 0 ? Math.round(((recentInterviews - prevOnlyInterviews) / prevOnlyInterviews) * 100) : 0;

    const responseRate = totalApps > 0 ? Math.round((totalInterviews / totalApps) * 100) : 0;
    const successRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0;

    return {
      applicationsSent: { value: totalApps, change: appChange },
      interviewsScheduled: { value: totalInterviews, change: interviewChange },
      responseRate: { value: `${responseRate}%`, change: 3 },
      successRate: { value: `${successRate}%`, change: 5 },
    };
  }

  private async getOverview(userEmail: string): Promise<OverviewDataPoint[]> {
    const now = new Date();
    const points: OverviewDataPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [appsInMonth, interviewsInMonth] = await Promise.all([
        this.appRepo
          .createQueryBuilder("a")
          .where("a.userEmail = :userEmail", { userEmail })
          .andWhere("a.appliedAt >= :start", { start })
          .andWhere("a.appliedAt < :end", { end })
          .getCount(),
        this.interviewRepo
          .createQueryBuilder("i")
          .where("i.userEmail = :userEmail", { userEmail })
          .andWhere("i.scheduledAt >= :start", { start })
          .andWhere("i.scheduledAt < :end", { end })
          .getCount(),
      ]);

      points.push({
        month: start.toLocaleString("default", { month: "short" }),
        applications: appsInMonth,
        interviews: interviewsInMonth,
      });
    }

    return points;
  }

  private async getRecentApplications(userEmail: string) {
    const apps = await this.appRepo.find({
      where: { userEmail },
      order: { appliedAt: "DESC" },
      take: 5,
    });

    return apps.map((a) => ({
      id: a.id,
      jobTitle: a.jobTitle,
      company: a.company,
      salary: a.salary,
      status: a.status,
      appliedAt: a.appliedAt,
    }));
  }

  private async getUpcomingInterviews(userEmail: string) {
    const now = new Date();
    const interviews = await this.interviewRepo.find({
      where: { userEmail, scheduledAt: MoreThanOrEqual(now) },
      order: { scheduledAt: "ASC" },
      take: 5,
    });

    return interviews.map((i) => ({
      id: i.id,
      jobTitle: i.jobTitle,
      company: i.company,
      scheduledAt: i.scheduledAt,
      prepStatus: i.prepStatus,
      initials: i.company
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase(),
    }));
  }

  async createApplication(userEmail: string, dto: CreateApplicationDto): Promise<JobApplication> {
    const app = this.appRepo.create({
      userEmail,
      jobTitle: dto.jobTitle,
      company: dto.company,
      salary: dto.salary,
      status: dto.status ?? ApplicationStatus.APPLIED,
      notes: dto.notes,
      sourceUrl: dto.sourceUrl,
      appliedAt: dto.appliedAt ? new Date(dto.appliedAt) : new Date(),
    });
    return this.appRepo.save(app);
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

  async seedSampleData(userEmail: string): Promise<{ message: string }> {
    const existingCount = await this.appRepo.count({ where: { userEmail } });
    if (existingCount > 0) {
      return { message: "Data already exists, skipping seed." };
    }

    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const applications = [
      { jobTitle: "Senior Frontend Developer", company: "TechCorp", salary: "$120k", status: ApplicationStatus.INTERVIEW, appliedAt: daysAgo(2) },
      { jobTitle: "Full Stack Engineer", company: "Stripe", salary: "$150k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(5) },
      { jobTitle: "React Developer", company: "Airbnb", salary: "$140k", status: ApplicationStatus.REJECTED, appliedAt: daysAgo(10) },
      { jobTitle: "Software Engineer", company: "Notion", salary: "$130k", status: ApplicationStatus.OFFER, appliedAt: daysAgo(20) },
      { jobTitle: "Frontend Engineer", company: "Linear", salary: "$125k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(3) },
      { jobTitle: "Staff Engineer", company: "Cloudflare", salary: "$160k", status: ApplicationStatus.INTERVIEW, appliedAt: daysAgo(7) },
      { jobTitle: "Senior Engineer", company: "Discord", salary: "$135k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(14) },
      { jobTitle: "Product Engineer", company: "Retool", salary: "$145k", status: ApplicationStatus.WITHDRAWN, appliedAt: daysAgo(18) },
      // Older entries for chart
      { jobTitle: "Software Engineer", company: "Coinbase", salary: "$155k", status: ApplicationStatus.REJECTED, appliedAt: daysAgo(40) },
      { jobTitle: "Frontend Developer", company: "Brex", salary: "$120k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(45) },
      { jobTitle: "Senior Developer", company: "Gusto", salary: "$128k", status: ApplicationStatus.INTERVIEW, appliedAt: daysAgo(50) },
      { jobTitle: "Engineer II", company: "Rippling", salary: "$132k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(55) },
      { jobTitle: "React Engineer", company: "Loom", salary: "$118k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(60) },
      { jobTitle: "Full Stack Dev", company: "Intercom", salary: "$125k", status: ApplicationStatus.OFFER, appliedAt: daysAgo(65) },
      { jobTitle: "Frontend Eng", company: "Reddit", salary: "$140k", status: ApplicationStatus.REJECTED, appliedAt: daysAgo(70) },
      { jobTitle: "Software Dev", company: "Airtable", salary: "$138k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(80) },
      { jobTitle: "Senior SWE", company: "Lyft", salary: "$145k", status: ApplicationStatus.INTERVIEW, appliedAt: daysAgo(90) },
      { jobTitle: "UI Engineer", company: "Coda", salary: "$115k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(100) },
      { jobTitle: "JS Developer", company: "Figma", salary: "$130k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(110) },
      { jobTitle: "Software Engineer", company: "Vercel", salary: "$142k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(120) },
      { jobTitle: "Senior Frontend", company: "Netlify", salary: "$122k", status: ApplicationStatus.REJECTED, appliedAt: daysAgo(130) },
      { jobTitle: "Platform Engineer", company: "Fastly", salary: "$148k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(140) },
      { jobTitle: "Senior Dev", company: "Twilio", salary: "$136k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(150) },
      { jobTitle: "Frontend Architect", company: "Auth0", salary: "$155k", status: ApplicationStatus.OFFER, appliedAt: daysAgo(155) },
      { jobTitle: "SWE III", company: "Segment", salary: "$128k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(160) },
      { jobTitle: "React Dev", company: "Mixpanel", salary: "$118k", status: ApplicationStatus.REJECTED, appliedAt: daysAgo(165) },
      { jobTitle: "Software Engineer", company: "Amplitude", salary: "$132k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(170) },
      { jobTitle: "Senior FE", company: "LaunchDarkly", salary: "$140k", status: ApplicationStatus.APPLIED, appliedAt: daysAgo(175) },
    ];

    const interviews = [
      { jobTitle: "Senior Frontend Developer", company: "TechCorp", scheduledAt: daysFromNow(1), prepStatus: PrepStatus.PREP_PENDING },
      { jobTitle: "Staff Engineer", company: "Cloudflare", scheduledAt: daysFromNow(3), prepStatus: PrepStatus.PREPPING },
      { jobTitle: "Senior Engineer", company: "Gusto", scheduledAt: daysFromNow(7), prepStatus: PrepStatus.READY },
      { jobTitle: "Senior SWE", company: "Lyft", scheduledAt: daysFromNow(10), prepStatus: PrepStatus.PREP_PENDING },
      { jobTitle: "Full Stack Engineer", company: "Stripe", scheduledAt: daysFromNow(14), prepStatus: PrepStatus.PREP_PENDING },
    ];

    await this.appRepo.save(
      applications.map((a) => this.appRepo.create({ ...a, userEmail })),
    );
    await this.interviewRepo.save(
      interviews.map((i) => this.interviewRepo.create({ ...i, userEmail })),
    );

    return { message: "Sample data seeded successfully." };
  }
}
