import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@resume/entities/user.entity";
import { DashboardService } from "../dashboard/dashboard.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dashboardService: DashboardService,
  ) {}

  async findAllUsers() {
    return this.userRepo.find({
      select: ["id", "email", "role", "createdAt"],
      order: { createdAt: "DESC" },
    });
  }

  async deleteUser(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found.");
    await this.userRepo.remove(user);
    return { ok: true };
  }

  async getUserDashboard(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found.");
    return this.dashboardService.getDashboardData(user.email);
  }

  async seedUserData(userEmail: string) {
    return this.dashboardService.seedSampleData(userEmail);
  }
}
