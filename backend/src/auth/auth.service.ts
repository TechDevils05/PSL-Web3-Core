import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Signup ────────────────────────────────────────────────────────────────
  async signup(email: string, password: string, displayName?: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const user = await this.usersService.createUser(email, password, displayName);
    const token = this.issueToken(user.id, user.email);

    return {
      token,
      user: this.usersService.toPublicProfile(user),
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const user = await this.usersService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.issueToken(user.id, user.email);

    return {
      token,
      user: this.usersService.toPublicProfile(user),
    };
  }

  // ── Get current user from JWT ─────────────────────────────────────────────
  async getMe(userId: string) {
    const user = this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return this.usersService.toPublicProfile(user);
  }

  // ── Token issue ───────────────────────────────────────────────────────────
  private issueToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
