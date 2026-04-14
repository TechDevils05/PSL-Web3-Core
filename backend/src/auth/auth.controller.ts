import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class SignupDto {
  email: string;
  password: string;
  displayName?: string;
}

class LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/signup
  // Body: { email, password, displayName? }
  // Returns: { token, user }
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.email, dto.password, dto.displayName);
  }

  // POST /api/auth/login
  // Body: { email, password }
  // Returns: { token, user }
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // GET /api/auth/me
  // Header: Authorization: Bearer <token>
  // Returns: public user profile + wallet address + owned token IDs
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    return this.authService.getMe(req.user.userId);
  }
}
