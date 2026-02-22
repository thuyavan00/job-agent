import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto, UpdateApplicationDto } from "./applications.dto";
import { ApplicationStatus } from "../dashboard/entities/job-application.entity";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import type { User } from "@resume/entities/user.entity";

@Controller("applications")
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  getApplications(
    @CurrentUser() user: User,
    @Query("search") search?: string,
    @Query("status") status?: ApplicationStatus,
  ) {
    return this.applicationsService.getApplications(user.email, search, status);
  }

  @Post()
  createApplication(@CurrentUser() user: User, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.createApplication(user.email, dto);
  }

  @Patch(":id")
  updateApplication(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.updateApplication(id, user.email, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteApplication(@CurrentUser() user: User, @Param("id") id: string) {
    return this.applicationsService.deleteApplication(id, user.email);
  }
}
