import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// @ts-ignore
import { ethers } from "ethers";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Blockchain Service — the single Ethers v6 gateway.
 *
 * Uses ethers.js DIRECTLY (not via Hardhat's hre) so we avoid
 * every ESM / ERR_PACKAGE_PATH_NOT_EXPORTED conflict.
 * The only coupling to Hardhat is reading compiled ABIs from artifacts/.
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);

  private provider!: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private scoutingPool!: ethers.Contract;
  private mockWFT!: ethers.Contract;

  constructor(private readonly config: ConfigService) {}

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */
  onModuleInit() {
    const rpcUrl = this.config.get<string>("RPC_URL")!;
    const privateKey = this.config.get<string>("PRIVATE_KEY")!;
    const poolAddress = this.config.get<string>("SCOUTING_POOL_ADDRESS");
    const wftAddress = this.config.get<string>("MOCK_WFT_ADDRESS");

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.logger.log(`Wallet connected: ${this.wallet.address}`);

    // ── Load ABIs from Hardhat compile artifacts ────────────────────
    const loadAbi = (contractPath: string): ethers.InterfaceAbi => {
      const full = join(process.cwd(), "artifacts", contractPath);
      const json = JSON.parse(readFileSync(full, "utf-8"));
      return json.abi;
    };

    if (poolAddress) {
      const poolAbi = loadAbi(
        "contracts/ScoutingPool.sol/ScoutingPool.json",
      );
      this.scoutingPool = new ethers.Contract(
        poolAddress,
        poolAbi,
        this.wallet,
      );
      this.logger.log(`ScoutingPool bound → ${poolAddress}`);
    } else {
      this.logger.warn(
        "SCOUTING_POOL_ADDRESS not set — contract calls will fail until deployed",
      );
    }

    if (wftAddress) {
      const wftAbi = loadAbi("contracts/MockWFT.sol/MockWFT.json");
      this.mockWFT = new ethers.Contract(wftAddress, wftAbi, this.wallet);
      this.logger.log(`MockWFT bound → ${wftAddress}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Accessors                                                          */
  /* ------------------------------------------------------------------ */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getWallet(): ethers.Wallet {
    return this.wallet;
  }

  getScoutingPool(): ethers.Contract {
    if (!this.scoutingPool) {
      throw new Error(
        "ScoutingPool contract not initialised. Set SCOUTING_POOL_ADDRESS in .env",
      );
    }
    return this.scoutingPool;
  }

  getMockWFT(): ethers.Contract {
    if (!this.mockWFT) {
      throw new Error(
        "MockWFT contract not initialised. Set MOCK_WFT_ADDRESS in .env",
      );
    }
    return this.mockWFT;
  }
}
