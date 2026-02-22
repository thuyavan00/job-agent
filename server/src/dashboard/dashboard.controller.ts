import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { CreateApplicationDto, UpdateApplicationDto, CreateInterviewDto } from "./dashboard.dto";
import { ApplicationStatus } from "./entities/job-application.entity";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { RolesGuard } from "@auth/guards/roles.guard";
import { Roles } from "@auth/decorators/roles.decorator";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import { UserRole } from "@resume/entities/user.entity";
import type { User } from "@resume/entities/user.entity";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: User) {
    return this.dashboardService.getDashboardData(user.email);
  }

  @Get("applications")
  getApplications(
    @CurrentUser() user: User,
    @Query("search") search?: string,
    @Query("status") status?: ApplicationStatus,
  ) {
    return this.dashboardService.getApplications(user.email, search, status);
  }

  @Post("applications")
  createApplication(@CurrentUser() user: User, @Body() dto: CreateApplicationDto) {
    return this.dashboardService.createApplication(user.email, dto);
  }

  @Patch("applications/:id")
  updateApplication(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.dashboardService.updateApplication(id, user.email, dto);
  }

  @Delete("applications/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteApplication(@CurrentUser() user: User, @Param("id") id: string) {
    return this.dashboardService.deleteApplication(id, user.email);
  }

  @Post("interviews")
  createInterview(@CurrentUser() user: User, @Body() dto: CreateInterviewDto) {
    return this.dashboardService.createInterview(user.email, dto);
  }

  @Post("seed")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  seedData(@CurrentUser() user: User) {
    return this.dashboardService.seedSampleData(user.email);
  }
}
