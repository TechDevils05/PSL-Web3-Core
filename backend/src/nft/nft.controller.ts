import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { NftService } from './nft.service';

@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  // GET /nft/supply — tier supply caps and remaining counts
  @Get('supply')
  getSupply() {
    return this.nftService.getSupplyData();
  }

  // GET /nft/total — total tokens minted
  @Get('total')
  async getTotal() {
    const total = await this.nftService.getTotalMinted();
    return { total };
  }

  // GET /nft/leaderboard?limit=10
  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.nftService.getLeaderboard(limit ? parseInt(limit) : 10);
  }

  // GET /nft/:tokenId
  @Get(':tokenId')
  getToken(@Param('tokenId', ParseIntPipe) tokenId: number) {
    return this.nftService.getToken(tokenId);
  }

  // GET /nft/player/:playerId/tokens
  @Get('player/:playerId/tokens')
  getPlayerTokens(@Param('playerId') playerId: string) {
    return this.nftService.getPlayerTokens(playerId);
  }

  // GET /nft/player/:playerId/stats
  @Get('player/:playerId/stats')
  getPlayerStats(@Param('playerId') playerId: string) {
    return this.nftService.getPlayerStats(playerId);
  }

  // GET /api/nft/player/:playerId/portfolio
  @Get('player/:playerId/portfolio')
  async getPortfolio(@Param('playerId') playerId: string) {
    const { tokens } = await this.nftService.getPlayerTokens(playerId);
    const prices = { COMMON: 25, RARE: 150, EPIC: 800, LEGEND: 3500, ICON: 15000 };
    const totalValue = tokens.reduce((sum, t) => sum + (prices[t.tier] ?? 0), 0);
    return {
      playerId,
      tokenCount: tokens.length,
      estimatedValueUsd: totalValue,
      highestTier: tokens.sort((a,b) => b.tierIndex - a.tierIndex)[0]?.tier ?? 'COMMON',
      tokens,
    };
  }
}
