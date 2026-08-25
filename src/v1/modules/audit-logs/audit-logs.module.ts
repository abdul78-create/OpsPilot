import { Module } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { PrismaModule } from '../../../core/database/prisma.module';
import { SecurityModule } from '../../../core/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsRepository, AuditLogsService],
  exports: [AuditLogsRepository, AuditLogsService],
})
export class AuditLogsModule {}
