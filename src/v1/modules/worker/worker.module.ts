import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PIPELINE_RUN_QUEUE } from '../../../core/worker/worker.constants';
import { StateMachineService } from '../../../core/worker/state-machine.service';
import { PipelineRunProcessor } from './processors/pipeline-run.processor';
import { JobExecutorService } from './services/job-executor.service';
import { DockerRunnerService } from './services/docker-runner.service';
import { WorkspaceManagerService } from './services/workspace-manager.service';
import { LogStreamingModule } from '../log-streaming/log-streaming.module';
import { DeploymentsModule } from '../deployments/deployments.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: PIPELINE_RUN_QUEUE,
    }),
    LogStreamingModule,
    DeploymentsModule,
  ],
  providers: [
    PipelineRunProcessor,
    JobExecutorService,
    DockerRunnerService,
    WorkspaceManagerService,
    StateMachineService,
  ],
  exports: [
    BullModule,
    StateMachineService,
    JobExecutorService,
    DockerRunnerService,
    WorkspaceManagerService,
  ],
})
export class WorkerModule {}
