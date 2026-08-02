import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PIPELINE_RUN_QUEUE } from '../../../core/worker/worker.constants';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';
import { PipelinesRepository } from './pipelines.repository';
import { WorkflowCompilerService } from './workflow-compiler.service';
import { PipelineOrchestratorService } from './services/pipeline-orchestrator.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PIPELINE_RUN_QUEUE,
    }),
  ],
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelinesRepository, WorkflowCompilerService, PipelineOrchestratorService],
  exports: [PipelinesService, PipelinesRepository, WorkflowCompilerService, PipelineOrchestratorService],
})
export class PipelinesModule {}
