import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CricketEvent {
  eventId: string;
  playerId: string;
  playerName: string;
  team: string;
  eventType: 'BATTING_MILESTONE' | 'BOWLING_MILESTONE';
  stat: string;
  runs?: number;
  ballsFaced?: number;
  strikeRate?: number;
  fours?: number;
  sixes?: number;
  wickets?: number;
  economy?: number;
  matchContext: string;
  rarityTrigger: string;
  matchId?: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: { trait_type: string; value: string | number }[];
}

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(private readonly config: ConfigService) {}

  // ─── Cricket API ──────────────────────────────────────────────

  // Fetch live match scores from CricAPI
  async fetchLiveMatches(): Promise<any[]> {
    const { key, baseUrl, seriesId } = this.config.get('cricapi');
    try {
      const res = await axios.get(`${baseUrl}/series_info`, {
        params: { apikey: key, id: seriesId },
      });
      return res.data?.data?.matchList ?? [];
    } catch (err) {
      this.logger.error('CricAPI fetchLiveMatches failed', err.message);
      return [];
    }
  }

  // Fetch player stats from CricAPI
  async fetchPlayerStats(playerId: string): Promise<any> {
    const { key, baseUrl } = this.config.get('cricapi');
    try {
      const res = await axios.get(`${baseUrl}/players_info`, {
        params: { apikey: key, id: playerId },
      });
      return res.data?.data ?? null;
    } catch (err) {
      this.logger.error(`CricAPI fetchPlayerStats failed for ${playerId}`, err.message);
      return null;
    }
  }

  // Fetch current match scorecard
  async fetchMatchScorecard(matchId: string): Promise<any> {
    const { key, baseUrl } = this.config.get('cricapi');
    try {
      const res = await axios.get(`${baseUrl}/match_scorecard`, {
        params: { apikey: key, id: matchId },
      });
      return res.data?.data ?? null;
    } catch (err) {
      this.logger.error(`CricAPI fetchMatchScorecard failed for ${matchId}`, err.message);
      return null;
    }
  }

  // ─── Metadata generation ─────────────────────────────────────

  // Build NFT description from cricket event data — no AI, pure template
  buildDescription(event: CricketEvent): string {
    if (event.eventType === 'BATTING_MILESTONE') {
      const sr = event.strikeRate?.toFixed(1) ?? 'N/A';
      const balls = event.ballsFaced ?? 'N/A';
      const fours = event.fours ?? 0;
      const sixes = event.sixes ?? 0;

      if (event.stat === 'six_sixes') {
        return `${event.playerName} achieved the unthinkable — six sixes in a single over. ` +
          `${event.matchContext}. Only ${this.getRarityCardCount(event.rarityTrigger)} card${this.getRarityCardCount(event.rarityTrigger) > 1 ? 's exist' : ' exists'} in existence.`;
      }

      if (event.stat === 'century') {
        return `${event.playerName} carved a breathtaking century — ${event.runs} runs off ${balls} balls ` +
          `at a strike rate of ${sr}. ${fours} boundaries and ${sixes} maximums. ${event.matchContext}.`;
      }

      if (event.stat === 'half_century') {
        return `${event.playerName} blazed ${event.runs} off ${balls} at ${sr}. ` +
          `${sixes} sixes powered a defining innings. ${event.matchContext}.`;
      }

      return `${event.playerName} delivered ${event.runs} runs at a strike rate of ${sr}. ${event.matchContext}.`;
    }

    // Bowling
    const econ = event.economy?.toFixed(2) ?? 'N/A';
    if (event.stat === 'hat_trick') {
      return `${event.playerName} completed a hat-trick — three wickets in three balls. ` +
        `${event.matchContext}. A moment that stopped the stadium.`;
    }

    if (event.stat === 'five_wicket_haul') {
      return `${event.playerName} ripped through the batting order — ${event.wickets} wickets ` +
        `at an economy of ${econ}. ${event.matchContext}.`;
    }

    return `${event.playerName} claimed ${event.wickets} wickets at ${econ} economy. ${event.matchContext}.`;
  }

  // Build the full ERC-721 metadata JSON
  buildMetadata(event: CricketEvent, imageIpfsCid: string): NFTMetadata {
    const tierName = event.rarityTrigger;
    const description = this.buildDescription(event);

    const attributes: { trait_type: string; value: string | number }[] = [
      { trait_type: 'Player', value: event.playerName },
      { trait_type: 'Team', value: event.team },
      { trait_type: 'Tier', value: tierName },
      { trait_type: 'Achievement', value: event.stat.replace(/_/g, ' ') },
      { trait_type: 'Season', value: 'PSL 2026' },
      { trait_type: 'Match Context', value: event.matchContext },
    ];

    if (event.eventType === 'BATTING_MILESTONE') {
      if (event.runs != null) attributes.push({ trait_type: 'Runs', value: event.runs });
      if (event.ballsFaced != null) attributes.push({ trait_type: 'Balls', value: event.ballsFaced });
      if (event.strikeRate != null) attributes.push({ trait_type: 'Strike Rate', value: Math.floor(event.strikeRate) });
      if (event.fours != null) attributes.push({ trait_type: 'Fours', value: event.fours });
      if (event.sixes != null) attributes.push({ trait_type: 'Sixes', value: event.sixes });
    } else {
      if (event.wickets != null) attributes.push({ trait_type: 'Wickets', value: event.wickets });
      if (event.economy != null) attributes.push({ trait_type: 'Economy', value: event.economy.toFixed(2) });
    }

    return {
      name: `${event.playerName} — ${event.stat.replace(/_/g, ' ')} (${tierName})`,
      description,
      image: `ipfs://${imageIpfsCid}/${event.playerId}_${tierName.toLowerCase()}.png`,
      external_url: `https://psldynamicnft.com/nft/${event.eventId}`,
      attributes,
    };
  }

  // ─── IPFS ─────────────────────────────────────────────────────

  async pinMetadata(event: CricketEvent, imageIpfsCid: string): Promise<string> {
    const metadata = this.buildMetadata(event, imageIpfsCid);
    const { apiKey, secretKey } = this.config.get('pinata');

    try {
      const res = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataContent: metadata,
          pinataMetadata: {
            name: `${event.playerId}_${event.eventId}_${event.rarityTrigger}.json`,
          },
        },
        {
          headers: {
            pinata_api_key: apiKey,
            pinata_secret_api_key: secretKey,
          },
        },
      );

      const uri = `ipfs://${res.data.IpfsHash}`;
      this.logger.log(`Pinned metadata for ${event.playerId}: ${uri}`);
      return uri;
    } catch (err) {
      this.logger.error('Pinata pin failed', err.message);
      // Fallback: return a mock URI so the demo doesn't break
      return `ipfs://QmMockFallback_${event.playerId}_${event.rarityTrigger}`;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private getRarityCardCount(tier: string): number {
    const caps = { COMMON: 10000, RARE: 1000, EPIC: 100, LEGEND: 10, ICON: 2 };
    return caps[tier] ?? 1;
  }

  // Build the base image CID lookup — in production these are pre-uploaded
  // tier artwork PNGs pinned to IPFS. For demo, use the same CID folder.
  getTierImageCid(tier: string): string {
    const imageCids: Record<string, string> = {
      COMMON: process.env.IMAGE_CID_COMMON || 'QmCommonImageFolderCID',
      RARE: process.env.IMAGE_CID_RARE || 'QmRareImageFolderCID',
      EPIC: process.env.IMAGE_CID_EPIC || 'QmEpicImageFolderCID',
      LEGEND: process.env.IMAGE_CID_LEGEND || 'QmLegendImageFolderCID',
      ICON: process.env.IMAGE_CID_ICON || 'QmIconImageFolderCID',
    };
    return imageCids[tier] ?? imageCids['COMMON'];
  }
}
