import { Module } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { MetadataController } from './metadata.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [MetadataService],
  controllers: [MetadataController],
  exports: [MetadataService],
})
export class MetadataModule {}
