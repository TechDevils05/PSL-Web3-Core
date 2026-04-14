import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { MetadataService, CricketEvent } from './metadata.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  // Preview metadata JSON without pinning
  @Post('preview')
  @UseGuards(AdminGuard)
  previewMetadata(@Body() event: CricketEvent) {
    const imageCid = this.metadataService.getTierImageCid(event.rarityTrigger);
    return this.metadataService.buildMetadata(event, imageCid);
  }

  // Pin metadata and return IPFS URI
  @Post('pin')
  @UseGuards(AdminGuard)
  async pinMetadata(@Body() event: CricketEvent) {
    const imageCid = this.metadataService.getTierImageCid(event.rarityTrigger);
    const uri = await this.metadataService.pinMetadata(event, imageCid);
    return { uri };
  }

  // Fetch live PSL matches
  @Get('matches/live')
  async getLiveMatches() {
    return this.metadataService.fetchLiveMatches();
  }

  // Fetch player stats from CricAPI
  @Get('player/:cricapiId/stats')
  async getPlayerStats(@Param('cricapiId') cricapiId: string) {
    return this.metadataService.fetchPlayerStats(cricapiId);
  }

  // Fetch match scorecard
  @Get('match/:matchId/scorecard')
  async getScorecard(@Param('matchId') matchId: string) {
    return this.metadataService.fetchMatchScorecard(matchId);
  }
}
