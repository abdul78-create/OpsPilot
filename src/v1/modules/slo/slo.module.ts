import { Module } from '@nestjs/common';
import { SloRepository } from './slo.repository';
import { SloService } from './slo.service';
import { SloController } from './slo.controller';
import { CoreModule } from '../../../core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [SloController],
  providers: [SloRepository, SloService],
  exports: [SloRepository, SloService],
})
export class SloModule {}
