import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PIPELINE_RUN_QUEUE } from '../../../core/worker/worker.constants';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';
import { PipelinesRepository } from './pipelines.repository';
import { WorkflowCompilerService } from './workflow-compiler.service';
import { PipelineOrchestratorService } from './services/pipeline-orchestrator.service';
import { WebhookPipelineRouterService } from './services/webhook-pipeline-router.service';
import { PipelineYamlParserService } from './services/pipeline-yaml-parser.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: PIPELINE_RUN_QUEUE,
    }),
  ],
  controllers: [PipelinesController],
  providers: [
    PipelinesService,
    PipelinesRepository,
    WorkflowCompilerService,
    PipelineOrchestratorService,
    WebhookPipelineRouterService,
    PipelineYamlParserService,
  ],
  exports: [
    PipelinesService,
    PipelinesRepository,
    WorkflowCompilerService,
    PipelineOrchestratorService,
    WebhookPipelineRouterService,
    PipelineYamlParserService,
  ],
})
export class PipelinesModule {}
