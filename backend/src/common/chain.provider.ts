import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { NFT_ABI, ORACLE_ABI, MARKETPLACE_ABI, YIELD_ABI } from './abi/contracts';

@Injectable()
export class ChainProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChainProvider.name);

  private wsProvider: ethers.WebSocketProvider;
  private destroyed = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 10;
  private readonly RECONNECT_DELAY = 3000;

  public provider: ethers.WebSocketProvider;
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
    await this.wsProvider?.destroy();
  }

  private async connect() {
    const wsUrl = this.config.get<string>('chain.wsUrl');
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
      this.wsProvider = new ethers.WebSocketProvider(wsUrl);
      await this.wsProvider.ready;

      this.provider = this.wsProvider;
      this.signer = new ethers.Wallet(privateKey, this.wsProvider);

      this.nftContract         = new ethers.Contract(contracts.nft,         NFT_ABI,         this.signer);
      this.oracleContract      = new ethers.Contract(contracts.oracle,      ORACLE_ABI,      this.signer);
      this.marketplaceContract = new ethers.Contract(contracts.marketplace, MARKETPLACE_ABI, this.wsProvider);
      this.yieldContract       = new ethers.Contract(contracts.yield,       YIELD_ABI,       this.wsProvider);

      this.reconnectAttempts = 0;
      this.logger.log(`Chain provider ready — signer: ${this.signer.address}`);

      (this.wsProvider.websocket as unknown as WebSocket).addEventListener('close', () => {
        if (!this.destroyed) {
          this.logger.warn('WebSocket closed — scheduling reconnect...');
          this.scheduleReconnect();
        }
      });
    } catch (err) {
      this.logger.error(`WebSocket connection failed: ${err.message}`);
      this.scheduleReconnect();
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
      await this.connect();
      this.onReconnect?.();
    }, delay);
  }
}