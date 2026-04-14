import { Module } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { OracleController } from './oracle.controller';
import { MetadataModule } from '../metadata/metadata.module';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MetadataModule, EventsModule, AuthModule],
  providers: [OracleService],
  controllers: [OracleController],
  exports: [OracleService],
})
export class OracleModule {}
