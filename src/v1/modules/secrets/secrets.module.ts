import { Module } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { SecretsController } from './secrets.controller';
import { GlobalSecretsController } from './global-secrets.controller';
import { SecretsRepository } from './secrets.repository';

@Module({
  controllers: [SecretsController, GlobalSecretsController],
  providers: [SecretsService, SecretsRepository],
  exports: [SecretsService, SecretsRepository],
})
export class SecretsModule {}
