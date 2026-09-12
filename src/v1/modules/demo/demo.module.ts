import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoSeedService } from './demo-seed.service';
import { DemoRunnerService } from './demo-runner.service';
import { AuthModule } from '../auth/auth.module';
import { LogStreamingModule } from '../log-streaming/log-streaming.module';

/**
 * DemoModule
 *
 * Provides isolated demo infrastructure for college presentation.
 * This module must NOT be imported in production configurations.
 * It is safely gated by DEMO_MODE_ENABLED=true at runtime.
 *
 * Exports:
 * - DemoSeedService (for use in JobExecutorService via optional injection)
 * - DemoRunnerService (for isolated demo pipeline simulation)
 */
@Module({
  imports: [AuthModule, LogStreamingModule],
  controllers: [DemoController],
  providers: [DemoSeedService, DemoRunnerService],
  exports: [DemoSeedService, DemoRunnerService],
})
export class DemoModule {}
