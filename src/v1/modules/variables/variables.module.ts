import { Module } from '@nestjs/common';
import { VariablesService } from './variables.service';
import { VariablesController } from './variables.controller';
import { VariablesRepository } from './variables.repository';

@Module({
  controllers: [VariablesController],
  providers: [VariablesService, VariablesRepository],
  exports: [VariablesService, VariablesRepository],
})
export class VariablesModule {}
