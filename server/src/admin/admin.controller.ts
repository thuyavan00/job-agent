import { Controller, Get, Delete, Post, Param, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { RolesGuard } from "@auth/guards/roles.guard";
import { Roles } from "@auth/decorators/roles.decorator";
import { UserRole } from "@resume/entities/user.entity";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  listUsers() {
    return this.adminService.findAllUsers();
  }

  @Delete("users/:id")
  deleteUser(@Param("id") id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get("users/:id/dashboard")
  getUserDashboard(@Param("id") id: string) {
    return this.adminService.getUserDashboard(id);
  }

  @Post("seed/:userEmail")
  seedData(@Param("userEmail") userEmail: string) {
    return this.adminService.seedUserData(userEmail);
  }
}
