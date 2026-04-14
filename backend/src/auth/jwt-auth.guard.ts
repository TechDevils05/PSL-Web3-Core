import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Use @UseGuards(JwtAuthGuard) on any route that requires a logged-in user.
// Injects req.user = { userId, email } when valid.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
