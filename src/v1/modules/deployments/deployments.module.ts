import { Module } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsRepository } from './deployments.repository';
import { ApprovalEngineService } from './services/approval-engine.service';
import { DeploymentRunnerService } from './services/deployment-runner.service';
import { LogStreamingModule } from '../log-streaming/log-streaming.module';

@Module({
  imports: [LogStreamingModule],
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    DeploymentsRepository,
    ApprovalEngineService,
    DeploymentRunnerService,
  ],
  exports: [
    DeploymentsService,
    DeploymentsRepository,
    ApprovalEngineService,
    DeploymentRunnerService,
  ],
})
export class DeploymentsModule {}
