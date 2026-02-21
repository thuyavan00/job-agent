import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@resume/entities/user.entity";
import { DashboardModule } from "../dashboard/dashboard.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [TypeOrmModule.forFeature([User]), DashboardModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
