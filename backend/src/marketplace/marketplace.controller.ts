import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // GET /marketplace/listings
  // Optional: ?player=babar-azam
  @Get('listings')
  async getListings(@Query('player') player?: string) {
    if (player) {
      return this.marketplaceService.getListingsByPlayer(player);
    }
    return this.marketplaceService.getActiveListings();
  }

  // GET /marketplace/listings/:tokenId
  @Get('listings/:tokenId')
  getListing(@Param('tokenId', ParseIntPipe) tokenId: number) {
    return this.marketplaceService.getListing(tokenId);
  }

  // GET /marketplace/history
  // All sales across the platform
  @Get('history')
  getAllHistory() {
    return this.marketplaceService.getSaleHistory();
  }

  // GET /marketplace/history/:tokenId
  // Sale history for a specific token
  @Get('history/:tokenId')
  getTokenHistory(@Param('tokenId', ParseIntPipe) tokenId: number) {
    return this.marketplaceService.getSaleHistory(tokenId);
  }

  // GET /marketplace/stats
  // Platform-wide volume, royalties paid, active listings
  @Get('stats')
  getStats() {
    return this.marketplaceService.getPlatformStats();
  }

  // GET /marketplace/yield/:tokenId
  @Get('yield/:tokenId')
  async getYield(@Param('tokenId', ParseIntPipe) tokenId: number) {
    const claimable = await this.marketplaceService.getClaimableYield(tokenId);
    return { tokenId, claimableEth: claimable };
  }

  // GET /marketplace/yield/accumulated
  @Get('yield/accumulated')
  async getAccumulated() {
    const total = await this.marketplaceService.getTotalYieldAccumulated();
    return { totalAccumulatedEth: total };
  }
}
