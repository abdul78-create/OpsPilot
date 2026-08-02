import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { WebhooksController } from './webhooks.controller';
import { RepositoriesRepository } from './repositories.repository';
import { GitHubRepositoryProvider } from './providers/github-repository.provider';
import { RepositoryScannerService } from './services/repository-scanner.service';
import { GitHubAppService } from './services/github-app.service';
import { PipelinesModule } from '../pipelines/pipelines.module';

@Module({
  imports: [JwtModule.register({}), PipelinesModule],
  controllers: [RepositoriesController, WebhooksController],
  providers: [
    RepositoriesService,
    RepositoriesRepository,
    GitHubRepositoryProvider,
    RepositoryScannerService,
    GitHubAppService,
    {
      provide: 'IRepositoryProvider',
      useClass: GitHubRepositoryProvider,
    },
  ],
  exports: [RepositoriesService, RepositoriesRepository, RepositoryScannerService, GitHubAppService, 'IRepositoryProvider'],
})
export class RepositoriesModule {}
