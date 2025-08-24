import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { ResumeService } from "@resume/resume.service";
import { ResumeController } from "@resume/resume.controller";
import { User } from "@resume/entities/user.entity";
import { Profile } from "@resume/entities/profile.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile])],
  controllers: [ResumeController],
  providers: [ResumeService],
})
export class ResumeModule {}
