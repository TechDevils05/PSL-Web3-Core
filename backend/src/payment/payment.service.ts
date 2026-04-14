import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe = require('stripe');
import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import { ChainProvider } from '../common/chain.provider';
import { MetadataService } from '../metadata/metadata.service';
import { EventsGateway } from '../events/events.gateway';
import { UsersService } from '../users/users.service';
import { TIER_FROM_STRING } from '../common/abi/contracts';
import * as mockData from '../../data/mockPSLStats.json';

// USD price per tier — displayed on the buy page
export const TIER_PRICES_USD: Record<string, number> = {
  COMMON: 25,
  RARE: 150,
  EPIC: 800,
  LEGEND: 3500,
  ICON: 15000,
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: InstanceType<typeof Stripe>;

  constructor(
    private readonly config: ConfigService,
    private readonly chain: ChainProvider,
    private readonly metadataService: MetadataService,
    private readonly eventsGateway: EventsGateway,
    private readonly usersService: UsersService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('stripe.secretKey'), {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    });
  }

  // ── Step 1: Create a Stripe PaymentIntent ────────────────────────────────
  // Frontend calls this first, gets a clientSecret, then renders Stripe Elements
  async createPaymentIntent(
    eventId: string,
    userId: string,
  ): Promise<{ clientSecret: string; amount: number; currency: string }> {
    const event = this.findEvent(eventId);
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);

    const user = this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const priceUsd = TIER_PRICES_USD[event.rarityTrigger] ?? 25;
    const amountCents = priceUsd * 100; // Stripe uses cents

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        eventId,
        userId,
        tier: event.rarityTrigger,
        playerName: event.playerName,
        walletAddress: user.walletAddress,
      },
      description: `PSL Dynamic Moments — ${event.playerName} (${event.rarityTrigger})`,
    });

    this.logger.log(
      `PaymentIntent created: ${paymentIntent.id} for ${event.playerName} — $${priceUsd}`,
    );

    return {
      clientSecret: paymentIntent.client_secret,
      amount: priceUsd,
      currency: 'USD',
    };
  }

  // ── Step 2: Stripe webhook — payment confirmed, mint the NFT ────────────
  // Stripe calls this endpoint after a successful payment.
  // In test mode this fires automatically — no real money needed.
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('stripe.webhookSecret');
    let stripeEvent: StripeTypes.Event;

    try {
      stripeEvent = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature failed: ${err.message}`);
    }

    if (stripeEvent.type === 'payment_intent.succeeded') {
      const intent = stripeEvent.data.object as StripeTypes.PaymentIntent;
      await this.mintAfterPayment(intent);
    }
  }

  // ── Step 2 (demo only): Confirm payment without real Stripe ─────────────
  // For the hackathon stage demo — skips Stripe entirely.
  // Frontend hits this after the fake card form.
  async confirmDemoPayment(
    eventId: string,
    userId: string,
  ): Promise<{ txHash: string; tokenId: number; tier: string }> {
    const event = this.findEvent(eventId);
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);

    const user = this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    return this.mintNftForUser(eventId, userId, user.walletAddress, event.rarityTrigger);
  }

  // ── Internal: actually mint the NFT after payment ────────────────────────
  private async mintAfterPayment(intent: StripeTypes.PaymentIntent): Promise<void> {
    const { eventId, userId, walletAddress, tier } = intent.metadata;

    try {
      await this.mintNftForUser(eventId, userId, walletAddress, tier);
    } catch (err) {
      this.logger.error(`Mint failed after payment ${intent.id}: ${err.message}`);
      // In production: queue for retry, refund if unresolvable
    }
  }

  private async mintNftForUser(
    eventId: string,
    userId: string,
    toAddress: string,
    tier: string,
  ): Promise<{ txHash: string; tokenId: number; tier: string }> {
    const event = this.findEvent(eventId);
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);

    const tierNum = TIER_FROM_STRING[tier];
    const imageCid = this.metadataService.getTierImageCid(tier);
    const ipfsUri = await this.metadataService.pinMetadata(event, imageCid);

    // Deadshot events (ICON) mint directly at that tier, no evolution path
    const isDeadshot = (event as any).isDeadshot === true;
    const txFn = isDeadshot
      ? this.chain.nftContract.mintAtTier(toAddress, event.playerId, ipfsUri, tierNum)
      : this.chain.nftContract.mintMoment(toAddress, event.playerId, ipfsUri, tierNum);

    const tx = await txFn;
    const receipt = await tx.wait();

    // Parse tokenId from MomentMinted event
    const tokenId = this.parseMintEvent(receipt);

    // Record ownership
    this.usersService.addTokenToUser(userId, tokenId);

    // Notify frontend — shows the "Minted!" step in the buy flow
    this.eventsGateway.broadcastMint({
      tokenId,
      playerId: event.playerId,
      playerName: event.playerName,
      tier,
      txHash: receipt.hash,
    });

    this.logger.log(
      `Minted token #${tokenId} (${tier}) → ${toAddress} | tx: ${receipt.hash}`,
    );

    return { txHash: receipt.hash, tokenId, tier };
  }

  // ── Buyable moments list ──────────────────────────────────────────────────
  getBuyableMoments() {
    return (mockData as any).matches
      .flatMap((m: any) => m.events)
      .map((e: any) => ({
        eventId: e.eventId,
        playerId: e.playerId,
        playerName: e.playerName,
        team: e.team,
        stat: e.stat,
        matchContext: e.matchContext,
        tier: e.rarityTrigger,
        priceUsd: TIER_PRICES_USD[e.rarityTrigger] ?? 25,
        isDeadshot: e.isDeadshot ?? false,
        deadshot: e.deadshot ?? null,
      }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private findEvent(eventId: string): any {
    return (mockData as any).matches
      .flatMap((m: any) => m.events)
      .find((e: any) => e.eventId === eventId);
  }

  private parseMintEvent(receipt: any): number {
    const iface = this.chain.nftContract.interface;
    for (const log of receipt.logs ?? []) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'MomentMinted') return Number(parsed.args.tokenId);
      } catch (_) {}
    }
    return Date.now(); // fallback for demo if event parsing fails
  }
}
