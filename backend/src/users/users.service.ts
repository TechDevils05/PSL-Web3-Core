import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, userStore } from './user.model';

@Injectable()
export class UsersService {
  constructor(private readonly config: ConfigService) {}

  // ── Create user with custodial wallet ────────────────────────────────────
  async createUser(email: string, password: string, displayName?: string): Promise<User> {
    // Check email not already taken
    const existing = userStore.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate a fresh Ethereum wallet for this user — they never see this
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = this.encryptPrivateKey(wallet.privateKey);

    const user: User = {
      id: uuidv4(),
      email: email.toLowerCase(),
      passwordHash,
      walletAddress: wallet.address,
      encryptedPrivateKey: encryptedKey,
      ownedTokenIds: [],
      displayName: displayName || email.split('@')[0],
      createdAt: new Date().toISOString(),
    };

    return userStore.create(user);
  }

  // ── Validate credentials for login ───────────────────────────────────────
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = userStore.findByEmail(email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  findById(id: string): User | undefined {
    return userStore.findById(id);
  }

  findByEmail(email: string): User | undefined {
    return userStore.findByEmail(email);
  }

  // ── Safe public profile (never expose private key or password hash) ──────
  toPublicProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      ownedTokenIds: user.ownedTokenIds,
      createdAt: user.createdAt,
    };
  }

  // ── Add NFT ownership after mint ─────────────────────────────────────────
  addTokenToUser(userId: string, tokenId: number): void {
    userStore.addTokenToUser(userId, tokenId);
  }

  // ── Decrypt the user's private key — only used internally for signing ────
  // Called by payment service when minting an NFT to the user's wallet
  getDecryptedPrivateKey(userId: string): string {
    const user = userStore.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.decryptPrivateKey(user.encryptedPrivateKey);
  }

  // ── Simple XOR encryption — replace with AES in production ──────────────
  private encryptPrivateKey(privateKey: string): string {
    const secret = this.config.get<string>('jwtSecret') || 'fallback-secret-change-me';
    // For hackathon: base64 encode with a prefix so it's not plaintext
    // In production: use crypto.createCipheriv with AES-256-GCM
    const encoded = Buffer.from(`${secret}:${privateKey}`).toString('base64');
    return encoded;
  }

  private decryptPrivateKey(encrypted: string): string {
    const secret = this.config.get<string>('jwtSecret') || 'fallback-secret-change-me';
    const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
    return decoded.replace(`${secret}:`, '');
  }
}
