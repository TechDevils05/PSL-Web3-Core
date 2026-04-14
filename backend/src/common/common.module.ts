import { Global, Module } from '@nestjs/common';
import { ChainProvider } from './chain.provider';

@Global()
@Module({
  providers: [ChainProvider],
  exports: [ChainProvider],
})
export class CommonModule {}