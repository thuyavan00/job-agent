import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { CreateApplicationDto, CreateInterviewDto } from "./dashboard.dto";
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

  @Post("applications")
  createApplication(@CurrentUser() user: User, @Body() dto: CreateApplicationDto) {
    return this.dashboardService.createApplication(user.email, dto);
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
