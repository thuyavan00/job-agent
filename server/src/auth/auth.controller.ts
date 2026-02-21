import { Body, Controller, Get, Post, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { User } from "@resume/entities/user.entity";

class AuthDto {
  email: string;
  password: string;
}

const COOKIE_NAME = "access_token";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function safeUser(user: User) {
  return { id: user.id, email: user.email, role: user.role };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: AuthDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.register(dto.email, dto.password);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    return safeUser(user);
  }

  @Post("login")
  async login(@Body() dto: AuthDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.login(dto.email, dto.password);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    return safeUser(user);
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: User) {
    if (!user) throw new UnauthorizedException();
    return safeUser(user);
  }
}
