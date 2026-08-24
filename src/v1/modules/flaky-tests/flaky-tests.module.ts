import { Module } from '@nestjs/common';
import { FlakyTestsRepository } from './flaky-tests.repository';
import { FlakyTestsService } from './flaky-tests.service';
import { FlakyTestsController } from './flaky-tests.controller';
import { CoreModule } from '../../../core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [FlakyTestsController],
  providers: [FlakyTestsRepository, FlakyTestsService],
  exports: [FlakyTestsRepository, FlakyTestsService],
})
export class FlakyTestsModule {}
