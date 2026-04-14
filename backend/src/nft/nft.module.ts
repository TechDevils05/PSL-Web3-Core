import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftController } from './nft.controller';

@Module({
  providers: [NftService],
  controllers: [NftController],
  exports: [NftService],
})
export class NftModule {}
