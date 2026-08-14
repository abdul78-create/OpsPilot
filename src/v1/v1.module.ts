import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { VariablesModule } from './modules/variables/variables.module';
import { SecretsModule } from './modules/secrets/secrets.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { RunsModule } from './modules/runs/runs.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { ArtifactsModule } from './modules/artifacts/artifacts.module';
import { WorkerModule } from './modules/worker/worker.module';
import { LogStreamingModule } from './modules/log-streaming/log-streaming.module';
import { AiOrchestrationModule } from './modules/ai-orchestration/ai-orchestration.module';
import { BillingModule } from './modules/billing/billing.module';

@Module({
  imports: [
    HealthModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    EnvironmentsModule,
    VariablesModule,
    SecretsModule,
    RepositoriesModule,
    PipelinesModule,
    RunsModule,
    DeploymentsModule,
    ObservabilityModule,
    ArtifactsModule,
    WorkerModule,
    LogStreamingModule,
    AiOrchestrationModule,
    BillingModule,
  ],
  exports: [
    HealthModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    EnvironmentsModule,
    VariablesModule,
    SecretsModule,
    RepositoriesModule,
    PipelinesModule,
    RunsModule,
    DeploymentsModule,
    ObservabilityModule,
    ArtifactsModule,
    WorkerModule,
    LogStreamingModule,
    AiOrchestrationModule,
    BillingModule,
  ],
})
export class V1Module {}
