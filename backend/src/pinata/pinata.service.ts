import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// @pinata/sdk is CommonJS — import as namespace to get the constructor
import * as PinataSDKModule from "@pinata/sdk";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PinataSDK = (PinataSDKModule as any).default ?? PinataSDKModule;
import { Readable } from "node:stream";

export interface PlayerMetadata {
  name: string;
  team: string;
  role: string;
  stats: Record<string, unknown>;
  image?: string;
  timestamp: string;
}

@Injectable()
export class PinataService implements OnModuleInit {
  private readonly logger = new Logger(PinataService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pinata!: any;
  private isConfigured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>("PINATA_API_KEY");
    const secret = this.config.get<string>("PINATA_SECRET_KEY");

    if (apiKey && secret) {
      this.pinata = new PinataSDK(apiKey, secret);
      this.isConfigured = true;
      this.logger.log("Pinata IPFS client initialised ✓");
    } else {
      this.logger.warn(
        "Pinata keys missing — IPFS uploads will return mock CIDs",
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Upload JSON metadata                                               */
  /* ------------------------------------------------------------------ */
  async uploadJSON(metadata: PlayerMetadata): Promise<string> {
    if (!this.isConfigured) {
      const mockCid = `QmMOCK${Date.now().toString(36).toUpperCase()}`;
      this.logger.warn(`Mock CID generated: ${mockCid}`);
      return mockCid;
    }

    const result = await this.pinata.pinJSONToIPFS(metadata, {
      pinataMetadata: { name: `player-${metadata.name}` },
    });
    this.logger.log(`JSON pinned → ${result.IpfsHash}`);
    return result.IpfsHash;
  }

  /* ------------------------------------------------------------------ */
  /*  Upload raw buffer (images, etc.)                                   */
  /* ------------------------------------------------------------------ */
  async uploadBuffer(buffer: Buffer, filename: string): Promise<string> {
    if (!this.isConfigured) {
      const mockCid = `QmIMG${Date.now().toString(36).toUpperCase()}`;
      this.logger.warn(`Mock image CID: ${mockCid}`);
      return mockCid;
    }

    const stream = Readable.from(buffer) as Readable & { path?: string };
    stream.path = filename; // Pinata SDK requires a path property

    const result = await this.pinata.pinFileToIPFS(stream, {
      pinataMetadata: { name: filename },
    });
    this.logger.log(`File pinned → ${result.IpfsHash}`);
    return result.IpfsHash;
  }

  /* ------------------------------------------------------------------ */
  /*  Gateway URL helper                                                 */
  /* ------------------------------------------------------------------ */
  getGatewayUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
}
