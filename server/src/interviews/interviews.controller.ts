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
import { InterviewsService } from "./interviews.service";
import { CreateInterviewDto, GetInterviewsQueryDto, UpdateInterviewDto } from "./interviews.dto";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import type { User } from "@resume/entities/user.entity";

@Controller("interviews")
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  getInterviews(@CurrentUser() user: User, @Query() query: GetInterviewsQueryDto) {
    return this.interviewsService.getInterviews(user.email, query);
  }

  @Post()
  createInterview(@CurrentUser() user: User, @Body() dto: CreateInterviewDto) {
    return this.interviewsService.createInterview(user.email, dto);
  }

  @Patch(":id")
  updateInterview(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviewsService.updateInterview(id, user.email, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteInterview(@CurrentUser() user: User, @Param("id") id: string) {
    return this.interviewsService.deleteInterview(id, user.email);
  }
}
