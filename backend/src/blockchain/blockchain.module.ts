import { Global, Module } from "@nestjs/common";
import { BlockchainService } from "./blockchain.service.js";

@Global()
@Module({
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
