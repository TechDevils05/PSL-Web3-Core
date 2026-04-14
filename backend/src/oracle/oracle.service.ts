import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChainProvider } from '../common/chain.provider';
import { MetadataService, CricketEvent } from '../metadata/metadata.service';
import { EventsGateway } from '../events/events.gateway';
import { TIER_FROM_STRING, TIER_NAMES } from '../common/abi/contracts';
import * as mockData from '../../data/mockPSLStats.json';

// ─── Score calculator ─────────────────────────────────────────────────────────

const MILESTONE_POINTS: Record<string, number> = {
  century: 80,
  half_century: 30,
  five_wicket_haul: 90,
  hat_trick: 100,
  six_sixes: 200,       // Deadshot tier — instant max
  player_of_match: 40,
  psl_title: 150,
  national_squad: 50,
};

interface PlayerData {
  recentMatches: { formPoints: number }[];
  milestones: { type: string; points: number }[];
  tradeVolume: number;
  maxTradeVolume: number;
  mintRarity: number; // 0–100
}

export function calculatePerformanceScore(player: PlayerData): {
  total: number;
  tier: string;
  breakdown: Record<string, number>;
} {
  const last5 = player.recentMatches.slice(-5);
  const avgForm =
    last5.length > 0
      ? last5.reduce((s, m) => s + m.formPoints, 0) / last5.length
      : 0;

  const formScore = (avgForm / 100) * 400;
  const milestoneScore = Math.min(
    player.milestones.reduce((s, m) => s + m.points, 0),
    250,
  );
  const popScore =
    player.maxTradeVolume > 0
      ? (player.tradeVolume / player.maxTradeVolume) * 200
      : 0;
  const rarityScore = (player.mintRarity / 100) * 150;

  const total = Math.min(
    Math.round(formScore + milestoneScore + popScore + rarityScore),
    1000,
  );

  return {
    total,
    tier: getTierFromScore(total),
    breakdown: { formScore, milestoneScore, popScore, rarityScore },
  };
}

function getTierFromScore(score: number): string {
  if (score >= 900) return 'ICON';
  if (score >= 700) return 'LEGEND';
  if (score >= 450) return 'EPIC';
  if (score >= 200) return 'RARE';
  return 'COMMON';
}

// ─── Oracle service ───────────────────────────────────────────────────────────

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);

  constructor(
    private readonly chain: ChainProvider,
    private readonly metadataService: MetadataService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ── Main trigger: called by controller or admin panel ──────────────────────
  async triggerUpgrade(eventId: string): Promise<{
    txHash: string;
    newTier: string;
    tokenIds: number[];
    ipfsUri: string;
  }> {
    const event = this.findEvent(eventId);
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);

    this.logger.log(`Triggering upgrade: ${event.playerName} — ${event.stat} → ${event.rarityTrigger}`);

    // 1. Build + pin metadata to IPFS
    const imageCid = this.metadataService.getTierImageCid(event.rarityTrigger);
    const ipfsUri = await this.metadataService.pinMetadata(event, imageCid);

    // 2. Push stats on-chain → smart contract runs upgrade logic
    const tx = await this.chain.oracleContract.updatePlayerStats(
      event.playerId,
      event.runs ?? 0,
      Math.floor(event.strikeRate ?? 0),
      event.wickets ?? 0,
      event.rarityTrigger,
      ipfsUri,
    );
    const receipt = await tx.wait();

    // 3. Read which tokenIds were upgraded (from TierUpgraded events in receipt)
    const upgradedTokenIds = this.parseUpgradeEvents(receipt);

    // 4. Get old tier before upgrade (read from chain for first affected token)
    let oldTier = 'COMMON';
    if (upgradedTokenIds.length > 0) {
      try {
        const tierNum = await this.chain.nftContract.tokenTier(upgradedTokenIds[0]);
        // The event fired means it upgraded, so old tier was one below
        oldTier = TIER_NAMES[Math.max(0, Number(tierNum) - 1)] ?? 'COMMON';
      } catch (_) {}
    }

    // 5. Broadcast to all WebSocket clients — frontend animates immediately
    const metadata = this.metadataService.buildMetadata(event, imageCid);
    this.eventsGateway.broadcastUpgrade({
      eventId,
      playerId: event.playerId,
      playerName: event.playerName,
      newTier: event.rarityTrigger,
      oldTier,
      txHash: receipt.hash,
      tokenIds: upgradedTokenIds,
      metadata,
    });

    this.logger.log(`Upgrade complete. txHash: ${receipt.hash} | tokens: ${upgradedTokenIds}`);
    return { txHash: receipt.hash, newTier: event.rarityTrigger, tokenIds: upgradedTokenIds, ipfsUri };
  }

  // ── Deadshot mint: ICON/LEGEND minted directly at high tier, no evolution ──
  async mintAtTier(
    toAddress: string,
    playerId: string,
    tier: string,
    eventId: string,
  ): Promise<{ txHash: string; tokenId: number }> {
    const event = this.findEvent(eventId);
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);

    const tierNum = TIER_FROM_STRING[tier];
    if (tierNum === undefined) throw new Error(`Unknown tier: ${tier}`);

    const imageCid = this.metadataService.getTierImageCid(tier);
    const ipfsUri = await this.metadataService.pinMetadata(event, imageCid);

    this.logger.log(`Minting ${tier} directly for ${playerId} → ${toAddress}`);

    const tx = await this.chain.nftContract.mintAtTier(
      toAddress,
      playerId,
      ipfsUri,
      tierNum,
    );
    const receipt = await tx.wait();

    // Parse MomentMinted event to get the new tokenId
    const tokenId = this.parseMintEvent(receipt);

    this.eventsGateway.broadcastMint({
      tokenId,
      playerId,
      playerName: event.playerName,
      tier,
      txHash: receipt.hash,
    });

    return { txHash: receipt.hash, tokenId };
  }

  // ── Register a player token so oracle knows what to upgrade ──────────────
  async registerToken(playerId: string, tokenId: number): Promise<string> {
    const tx = await this.chain.oracleContract.registerPlayerToken(playerId, tokenId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ── Score calculator (public, used by NFT service too) ───────────────────
  calculateScore(playerData: PlayerData) {
    return calculatePerformanceScore(playerData);
  }

  getMilestonePoints() {
    return MILESTONE_POINTS;
  }

  // ── List all available mock events ───────────────────────────────────────
  listMockEvents(): CricketEvent[] {
    return (mockData as any).matches.flatMap((m: any) => m.events);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private findEvent(eventId: string): CricketEvent | undefined {
    return (mockData as any).matches
      .flatMap((m: any) => m.events)
      .find((e: any) => e.eventId === eventId);
  }

  private parseUpgradeEvents(receipt: any): number[] {
    const iface = this.chain.oracleContract.interface;
    const tokenIds: number[] = [];

    for (const log of receipt.logs ?? []) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'UpgradeTriggered') {
          tokenIds.push(Number(parsed.args.tokenId));
        }
      } catch (_) {}
    }

    return tokenIds;
  }

  private parseMintEvent(receipt: any): number {
    const iface = this.chain.nftContract.interface;
    for (const log of receipt.logs ?? []) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'MomentMinted') {
          return Number(parsed.args.tokenId);
        }
      } catch (_) {}
    }
    return -1;
  }
}
