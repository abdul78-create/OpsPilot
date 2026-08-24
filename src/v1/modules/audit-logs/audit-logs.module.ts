import { Module } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { CoreModule } from '../../../core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsRepository, AuditLogsService],
  exports: [AuditLogsRepository, AuditLogsService],
})
export class AuditLogsModule {}
