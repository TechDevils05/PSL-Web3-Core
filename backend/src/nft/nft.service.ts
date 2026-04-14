import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChainProvider } from '../common/chain.provider';
import { TIER_NAMES, MAX_SUPPLY } from '../common/abi/contracts';
import { ethers } from 'ethers';

export interface TokenData {
  tokenId: number;
  owner: string;
  playerId: string;
  tier: string;
  tierIndex: number;
  tokenUri: string;
  tbaAddress: string;
  tbaBalance: string; // in ETH
  listing: {
    active: boolean;
    price: string;
    seller: string;
  } | null;
  claimableYield: string;
}

export interface PlayerTokensData {
  playerId: string;
  tokenIds: number[];
  tokens: Omit<TokenData, 'listing' | 'claimableYield'>[];
}

export interface SupplyData {
  tier: string;
  minted: number;
  max: number;
  remaining: number;
  percentFilled: number;
}

@Injectable()
export class NftService {
  private readonly logger = new Logger(NftService.name);

  constructor(private readonly chain: ChainProvider) {}

  // ── Single token ─────────────────────────────────────────────────────────
  async getToken(tokenId: number): Promise<TokenData> {
    try {
      const [owner, tierRaw, playerIdStr, tokenUri, tbaAddress] =
        await Promise.all([
          this.chain.nftContract.ownerOf(tokenId),
          this.chain.nftContract.tokenTier(tokenId),
          this.chain.nftContract.playerId(tokenId),
          this.chain.nftContract.tokenURI(tokenId),
          this.chain.nftContract.getTBAAddress(tokenId),
        ]);

      const tierIndex = Number(tierRaw);
      const tier = TIER_NAMES[tierIndex] ?? 'COMMON';

      // TBA wallet balance
      const tbaBalanceWei = await this.chain.provider.getBalance(tbaAddress);
      const tbaBalance = ethers.formatEther(tbaBalanceWei);

      // Marketplace listing
      let listing = null;
      try {
        const l = await this.chain.marketplaceContract.listings(tokenId);
        if (l.active) {
          listing = {
            active: true,
            price: ethers.formatEther(l.price),
            seller: l.seller,
          };
        }
      } catch (_) {}

      // Claimable yield
      let claimableYield = '0';
      try {
        const yieldWei = await this.chain.yieldContract.claimableByToken(tokenId);
        claimableYield = ethers.formatEther(yieldWei);
      } catch (_) {}

      return {
        tokenId,
        owner,
        playerId: playerIdStr,
        tier,
        tierIndex,
        tokenUri,
        tbaAddress,
        tbaBalance,
        listing,
        claimableYield,
      };
    } catch (err) {
      throw new NotFoundException(`Token ${tokenId} not found: ${err.message}`);
    }
  }

  // ── All tokens for a player ───────────────────────────────────────────────
  async getPlayerTokens(playerId: string): Promise<PlayerTokensData> {
    let tokenIds: number[] = [];

    try {
      const raw = await this.chain.nftContract.playerTokens(playerId);
      tokenIds = raw.map(Number);
    } catch (err) {
      this.logger.warn(`No tokens found for player ${playerId}`);
      return { playerId, tokenIds: [], tokens: [] };
    }

    // Fetch basic data for each token (no listing/yield — reduces RPC calls)
    const tokens = await Promise.all(
      tokenIds.map(async (id) => {
        try {
          const [owner, tierRaw, tokenUri, tbaAddress] = await Promise.all([
            this.chain.nftContract.ownerOf(id),
            this.chain.nftContract.tokenTier(id),
            this.chain.nftContract.tokenURI(id),
            this.chain.nftContract.getTBAAddress(id),
          ]);
          const tierIndex = Number(tierRaw);
          return {
            tokenId: id,
            owner,
            playerId,
            tier: TIER_NAMES[tierIndex] ?? 'COMMON',
            tierIndex,
            tokenUri,
            tbaAddress,
            tbaBalance: '0',
          };
        } catch (_) {
          return null;
        }
      }),
    );

    return {
      playerId,
      tokenIds,
      tokens: tokens.filter(Boolean),
    };
  }

  // ── Latest player stats from oracle ──────────────────────────────────────
  async getPlayerStats(playerId: string) {
    try {
      const stats = await this.chain.oracleContract.latestStats(playerId);
      return {
        playerId,
        runs: Number(stats.runs),
        strikeRate: Number(stats.strikeRate),
        wickets: Number(stats.wickets),
        tier: stats.tier,
        lastUpdated: new Date(Number(stats.lastUpdated) * 1000).toISOString(),
      };
    } catch (err) {
      return { playerId, runs: 0, strikeRate: 0, wickets: 0, tier: 'COMMON', lastUpdated: null };
    }
  }

  // ── Supply data for all tiers ────────────────────────────────────────────
  async getSupplyData(): Promise<SupplyData[]> {
    const tiers = [0, 1, 2, 3, 4]; // COMMON → ICON
    const results: SupplyData[] = [];

    for (const tierIndex of tiers) {
      try {
        const [minted, max] = await Promise.all([
          this.chain.nftContract.mintedByTier(tierIndex),
          this.chain.nftContract.maxSupplyByTier(tierIndex),
        ]);
        const mintedNum = Number(minted);
        const maxNum = Number(max);
        const tierName = TIER_NAMES[tierIndex];

        results.push({
          tier: tierName,
          minted: mintedNum,
          max: maxNum,
          remaining: maxNum - mintedNum,
          percentFilled: maxNum > 0 ? Math.round((mintedNum / maxNum) * 100) : 0,
        });
      } catch (_) {
        // Fallback to hardcoded max supply if contract call fails
        const tierName = TIER_NAMES[tierIndex];
        results.push({
          tier: tierName,
          minted: 0,
          max: MAX_SUPPLY[tierName] ?? 0,
          remaining: MAX_SUPPLY[tierName] ?? 0,
          percentFilled: 0,
        });
      }
    }

    return results;
  }

  // ── Total minted count ───────────────────────────────────────────────────
  async getTotalMinted(): Promise<number> {
    try {
      const next = await this.chain.nftContract.nextTokenId();
      return Number(next);
    } catch (_) {
      return 0;
    }
  }

  // ── Leaderboard: top tokens by tier ──────────────────────────────────────
  async getLeaderboard(limit = 10): Promise<{ tokenId: number; tier: string; owner: string }[]> {
    const total = await this.getTotalMinted();
    if (total === 0) return [];

    const tokenIds = Array.from({ length: Math.min(total, 100) }, (_, i) => i);

    const results = await Promise.all(
      tokenIds.map(async (id) => {
        try {
          const [tierRaw, owner] = await Promise.all([
            this.chain.nftContract.tokenTier(id),
            this.chain.nftContract.ownerOf(id),
          ]);
          return { tokenId: id, tierIndex: Number(tierRaw), tier: TIER_NAMES[Number(tierRaw)], owner };
        } catch (_) {
          return null;
        }
      }),
    );

    return results
      .filter(Boolean)
      .sort((a, b) => b.tierIndex - a.tierIndex)
      .slice(0, limit)
      .map(({ tokenId, tier, owner }) => ({ tokenId, tier, owner }));
  }
}
