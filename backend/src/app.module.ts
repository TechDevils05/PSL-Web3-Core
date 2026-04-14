import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { MetadataModule } from './metadata/metadata.module';
import { OracleModule } from './oracle/oracle.module';
import { NftModule } from './nft/nft.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Config must be first — everything depends on it
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // Shared modules
    AuthModule,
    EventsModule,
    MetadataModule,
    CommonModule,

    // Feature modules
    OracleModule,
    NftModule,
    MarketplaceModule,
  ],
})
export class AppModule {}
