import { Module } from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsRepository } from './environments.repository';

@Module({
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService, EnvironmentsRepository],
  exports: [EnvironmentsService, EnvironmentsRepository],
})
export class EnvironmentsModule {}
