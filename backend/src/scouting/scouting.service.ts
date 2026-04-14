import { Injectable, Logger } from "@nestjs/common";
// @ts-ignore
import { ethers } from "ethers";
import { BlockchainService } from "../blockchain/blockchain.service.js";
import { PinataService, PlayerMetadata } from "../pinata/pinata.service.js";
import { RegisterPlayerDto } from "./dto/register-player.dto.js";

export interface PoolData {
  staked: string;
  earnings: string;
}

export interface YieldResult {
  playerId: string;
  performanceScore: number;
  yieldAmount: string;
  txHash: string;
}

@Injectable()
export class ScoutingService {
  private readonly logger = new Logger(ScoutingService.name);

  constructor(
    private readonly blockchain: BlockchainService,
    private readonly pinata: PinataService,
  ) {}

  /* ================================================================== */
  /*  IPFS  +  On-chain metadata                                        */
  /* ================================================================== */

  /**
   * 1. Upload player image to IPFS (if provided)
   * 2. Upload full metadata JSON to IPFS
   * 3. Store the CID on-chain via setPlayerMetadata
   */
  async registerPlayer(dto: RegisterPlayerDto) {
    const pool = this.blockchain.getScoutingPool();
    const playerId = dto.name.toLowerCase().replace(/\s+/g, "-");

    // ── Image upload ────────────────────────────────────────────────
    let imageCid: string | undefined;
    if (dto.imageBase64) {
      const buf = Buffer.from(dto.imageBase64, "base64");
      imageCid = await this.pinata.uploadBuffer(buf, `${playerId}-avatar.png`);
    }

    // ── Metadata JSON upload ────────────────────────────────────────
    const metadata: PlayerMetadata = {
      name: dto.name,
      team: dto.team,
      role: dto.role,
      stats: dto.stats ?? {},
      image: imageCid ? `ipfs://${imageCid}` : undefined,
      timestamp: new Date().toISOString(),
    };
    const metaCid = await this.pinata.uploadJSON(metadata);
    const uri = `ipfs://${metaCid}`;

    // ── On-chain registration ───────────────────────────────────────
    const tx = await pool.setPlayerMetadata(playerId, uri);
    const receipt = await tx.wait();

    this.logger.log(
      `Player "${dto.name}" registered | CID ${metaCid} | tx ${receipt.hash}`,
    );

    return {
      playerId,
      metadataURI: uri,
      gatewayUrl: this.pinata.getGatewayUrl(metaCid),
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /* ================================================================== */
  /*  Pool queries                                                      */
  /* ================================================================== */

  async getPoolData(playerId: string): Promise<PoolData> {
    const pool = this.blockchain.getScoutingPool();
    const [staked, earnings] = await pool.getPoolData(playerId);
    return {
      staked: ethers.formatEther(staked),
      earnings: ethers.formatEther(earnings),
    };
  }

  async getUserStake(playerId: string, userAddress: string): Promise<string> {
    const pool = this.blockchain.getScoutingPool();
    const stake = await pool.getUserStake(playerId, userAddress);
    return ethers.formatEther(stake);
  }

  /* ================================================================== */
  /*  Yield distribution  (called by the match-watcher / endpoint)      */
  /* ================================================================== */

  /**
   * Simulates a match performance event and distributes yield accordingly.
   *
   * Performance score  0-100  →  yield multiplier:
   *   90-100  "Legendary"   →  5 %  of current pool stake
   *   75-89   "Epic"        →  3 %
   *   50-74   "Rare"        →  1.5 %
   *   0-49    "Common"      →  0.5 %
   */
  async distributeYield(
    playerId: string,
    performanceScore: number,
  ): Promise<YieldResult> {
    const pool = this.blockchain.getScoutingPool();

    // ── Determine yield multiplier ──────────────────────────────────
    let multiplierBps: bigint; // basis points (100 = 1 %)
    if (performanceScore >= 90) multiplierBps = 500n;
    else if (performanceScore >= 75) multiplierBps = 300n;
    else if (performanceScore >= 50) multiplierBps = 150n;
    else multiplierBps = 50n;

    const [totalStaked] = await pool.getPoolData(playerId);
    const yieldAmount = (totalStaked * multiplierBps) / 10_000n;

    if (yieldAmount === 0n) {
      throw new Error(
        `Yield is zero — pool "${playerId}" may have no stakers`,
      );
    }

    // ── Execute on-chain ────────────────────────────────────────────
    const tx = await pool.distributeYield(playerId, yieldAmount);
    const receipt = await tx.wait();

    this.logger.log(
      `Yield distributed → ${playerId} | score ${performanceScore} | ` +
        `amount ${ethers.formatEther(yieldAmount)} WFT | tx ${receipt.hash}`,
    );

    return {
      playerId,
      performanceScore,
      yieldAmount: ethers.formatEther(yieldAmount),
      txHash: receipt.hash,
    };
  }

  /* ================================================================== */
  /*  Simulated match worker (for demo / judges)                        */
  /* ================================================================== */

  async simulateMatchPerformance(playerId: string): Promise<YieldResult> {
    // Random high-pressure score like a real PSL match
    const score = Math.floor(Math.random() * (100 - 40 + 1)) + 40;
    this.logger.log(
      `🏏 Simulated match for "${playerId}" → Performance Score: ${score}/100`,
    );
    return this.distributeYield(playerId, score);
  }
}
