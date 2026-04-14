import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { OracleService } from './oracle.service';
import { AdminGuard } from '../auth/admin.guard';

class MintAtTierDto {
  toAddress: string;
  playerId: string;
  tier: string;
  eventId: string;
}

class RegisterTokenDto {
  playerId: string;
  tokenId: number;
}

class ScoreDto {
  recentMatches: { formPoints: number }[];
  milestones: { type: string; points: number }[];
  tradeVolume: number;
  maxTradeVolume: number;
  mintRarity: number;
}

@Controller('oracle')
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  // ── Demo trigger — this is the button in the admin panel ─────────────────
  // POST /oracle/trigger/EVT-DEMO
  // Header: x-admin-key: your_secret
  @Post('trigger/:eventId')
  @UseGuards(AdminGuard)
  @HttpCode(200)
  async triggerUpgrade(@Param('eventId') eventId: string) {
    return this.oracleService.triggerUpgrade(eventId);
  }

  // ── Deadshot mint — mint directly at LEGEND or ICON tier ────────────────
  // For 6 sixes in an over, hat-tricks in finals, etc.
  @Post('mint-at-tier')
  @UseGuards(AdminGuard)
  async mintAtTier(@Body() dto: MintAtTierDto) {
    return this.oracleService.mintAtTier(
      dto.toAddress,
      dto.playerId,
      dto.tier,
      dto.eventId,
    );
  }

  // ── Register a token with the oracle after minting ───────────────────────
  @Post('register-token')
  @UseGuards(AdminGuard)
  async registerToken(@Body() dto: RegisterTokenDto) {
    const txHash = await this.oracleService.registerToken(dto.playerId, dto.tokenId);
    return { txHash };
  }

  // ── Score calculator endpoint (no chain call, pure math) ─────────────────
  @Post('score/calculate')
  calculateScore(@Body() dto: ScoreDto) {
    return this.oracleService.calculateScore(dto);
  }

  // ── List all mock events available to trigger ────────────────────────────
  @Get('events/list')
  listEvents() {
    return this.oracleService.listMockEvents();
  }

  // ── Milestone points table ───────────────────────────────────────────────
  @Get('milestones')
  getMilestones() {
    return this.oracleService.getMilestonePoints();
  }

  // purchasable nfts for the marketplace
  @Get('moments/buyable')
  getBuyableMoments() {
    return this.oracleService.listMockEvents().map(e => ({
      eventId: e.eventId,
      playerId: e.playerId,
      playerName: e.playerName,
      team: e.team,
      stat: e.stat,
      matchContext: e.matchContext,
      tier: e.rarityTrigger,
      isDeadshot: (e as any).isDeadshot ?? false,
      price: this.getPriceForTier(e.rarityTrigger),
    }));
  }

  private getPriceForTier(tier: string): number {
    const prices = { COMMON: 25, RARE: 150, EPIC: 800, LEGEND: 3500, ICON: 15000 };
    return prices[tier] ?? 25;
  }
}
