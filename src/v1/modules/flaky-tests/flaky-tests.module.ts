import { Module } from '@nestjs/common';
import { FlakyTestsRepository } from './flaky-tests.repository';
import { FlakyTestsService } from './flaky-tests.service';
import { FlakyTestsController } from './flaky-tests.controller';
import { PrismaModule } from '../../../core/database/prisma.module';
import { SecurityModule } from '../../../core/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [FlakyTestsController],
  providers: [FlakyTestsRepository, FlakyTestsService],
  exports: [FlakyTestsRepository, FlakyTestsService],
})
export class FlakyTestsModule {}
