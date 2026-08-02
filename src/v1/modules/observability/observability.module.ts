import { Module } from '@nestjs/common';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { MetricsController } from './controllers/metrics.controller';
import { HealthMonitoringController } from './controllers/health-monitoring.controller';
import { AuditLogsService } from './services/audit-logs.service';
import { MetricsService } from './services/metrics.service';
import { HealthMonitoringService } from './services/health-monitoring.service';
import { ObservabilityRepository } from './observability.repository';

@Module({
  controllers: [AuditLogsController, MetricsController, HealthMonitoringController],
  providers: [AuditLogsService, MetricsService, HealthMonitoringService, ObservabilityRepository],
  exports: [AuditLogsService, MetricsService, HealthMonitoringService, ObservabilityRepository],
})
export class ObservabilityModule {}
