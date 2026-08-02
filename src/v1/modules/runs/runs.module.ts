import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RunsService } from './runs.service';
import { RunsController } from './runs.controller';
import { RunsRepository } from './runs.repository';
import { TriggerEngineService } from './services/trigger-engine.service';
import { PIPELINE_RUN_QUEUE } from '../../../core/worker/worker.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PIPELINE_RUN_QUEUE,
    }),
  ],
  controllers: [RunsController],
  providers: [RunsService, RunsRepository, TriggerEngineService],
  exports: [RunsService, RunsRepository, TriggerEngineService],
})
export class RunsModule {}
