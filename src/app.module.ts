import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BlockchainModule } from "./blockchain/blockchain.module.js";
import { PinataModule } from "./pinata/pinata.module.js";
import { ScoutingModule } from "./scouting/scouting.module.js";
import { envSchema } from "./config/env.validation.js";

@Module({
  imports: [
    // ─── Global config with Joi validation ──────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath: ".env",
    }),
    BlockchainModule,
    PinataModule,
    ScoutingModule,
  ],
})
export class AppModule {}
