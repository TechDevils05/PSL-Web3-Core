import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { NFT_ABI, ORACLE_ABI, MARKETPLACE_ABI, YIELD_ABI } from './abi/contracts';

@Injectable()
export class ChainProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChainProvider.name);

  private httpProvider: ethers.JsonRpcProvider;
  private destroyed = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 10;
  private readonly RECONNECT_DELAY = 3000;

  public provider: ethers.JsonRpcProvider;
  public signer: ethers.Wallet;
  public nftContract: ethers.Contract;
  public oracleContract: ethers.Contract;
  public marketplaceContract: ethers.Contract;
  public yieldContract: ethers.Contract;
  public onReconnect: (() => void) | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    this.destroyed = true;
    // JsonRpcProvider has no destroy(), just mark as destroyed
  }

  private async connect() {
    const rpcUrl = this.config.get<string>('chain.rpcUrl');
    this.logger.log(`Connecting to: ${rpcUrl ? rpcUrl.substring(0, 30) + '...' : 'UNDEFINED ❌'}`);

    const privateKey = this.config.get<string>('chain.privateKey');
    const contracts = this.config.get('contracts');

    for (const [name, addr] of Object.entries({
      nft: contracts.nft,
      oracle: contracts.oracle,
      marketplace: contracts.marketplace,
      yield: contracts.yield,
    })) {
      if (!addr) throw new Error(`Contract address missing: ${name}`);
    }

    try {
      this.httpProvider = new ethers.JsonRpcProvider(rpcUrl);

      await Promise.race([
        this.httpProvider.getNetwork(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
        ),
      ]);

      this.provider = this.httpProvider;
      this.signer = new ethers.Wallet(privateKey, this.httpProvider);

      this.nftContract         = new ethers.Contract(contracts.nft,         NFT_ABI,         this.signer);
      this.oracleContract      = new ethers.Contract(contracts.oracle,      ORACLE_ABI,      this.signer);
      this.marketplaceContract = new ethers.Contract(contracts.marketplace, MARKETPLACE_ABI, this.httpProvider);
      this.yieldContract       = new ethers.Contract(contracts.yield,       YIELD_ABI,       this.httpProvider);

      this.reconnectAttempts = 0;
      this.logger.log(`Chain provider ready — signer: ${this.signer.address}`);

    } catch (err) {
      const error = err as Error;
      this.logger.error(`Connection failed: ${error.message}`);
      if (!this.destroyed) this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT) {
      this.logger.error('Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * this.reconnectAttempts;
    this.logger.log(`Reconnect ${this.reconnectAttempts}/${this.MAX_RECONNECT} in ${delay}ms`);

    setTimeout(async () => {
      if (!this.destroyed) {
        await this.connect();
        this.onReconnect?.();
      }
    }, delay);
  }
}