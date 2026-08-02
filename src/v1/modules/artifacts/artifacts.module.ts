import { Module } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsRepository } from './artifacts.repository';

@Module({
  controllers: [ArtifactsController],
  providers: [ArtifactsService, ArtifactsRepository],
  exports: [ArtifactsService, ArtifactsRepository],
})
export class ArtifactsModule {}
