import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateIntentDto {
  eventId: string;
}

class DemoConfirmDto {
  eventId: string;
}

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // GET /api/payment/moments
  // Returns all purchasable moments with prices — populates the buy page list
  // Public — no auth needed to browse
  @Get('moments')
  getBuyableMoments() {
    return this.paymentService.getBuyableMoments();
  }

  // POST /api/payment/intent
  // Header: Authorization: Bearer <token>
  // Body: { eventId }
  // Returns: { clientSecret, amount, currency }
  // Frontend uses clientSecret with Stripe.js to render the card form
  @Post('intent')
  @UseGuards(JwtAuthGuard)
  async createIntent(
    @Body() dto: CreateIntentDto,
    @Request() req,
  ) {
    return this.paymentService.createPaymentIntent(dto.eventId, req.user.userId);
  }

  // POST /api/payment/webhook
  // Called by Stripe automatically after a real payment succeeds.
  // NOT protected by JWT — Stripe calls this, not the user.
  // The raw body is required for Stripe signature verification.
  @Post('webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentService.handleWebhook(req.rawBody as Buffer, signature);
    return { received: true };
  }

  // POST /api/payment/demo-confirm
  // Header: Authorization: Bearer <token>
  // Body: { eventId }
  // DEMO ONLY — skips Stripe, mints immediately.
  // This is what the "Mint · $4,200" button calls on stage.
  @Post('demo-confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async demoConfirm(
    @Body() dto: DemoConfirmDto,
    @Request() req,
  ) {
    return this.paymentService.confirmDemoPayment(dto.eventId, req.user.userId);
  }
}
