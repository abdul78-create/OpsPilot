import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { PrismaService } from '../../../../core/database/prisma.service';
import { SystemMetricsResponseDto } from '../dto/system-metrics-response.dto';
import { DeploymentStatus } from '@prisma/client';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemMetrics(): Promise<SystemMetricsResponseDto> {
    const [
      totalOrganizations,
      totalProjects,
      totalEnvironments,
      totalPipelineDefinitions,
      totalPipelineRuns,
      totalDeployments,
      successfulDeployments,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.environment.count({ where: { deletedAt: null } }),
      this.prisma.pipelineDefinition.count({ where: { deletedAt: null } }),
      this.prisma.pipelineRun.count({ where: { deletedAt: null } }),
      this.prisma.deployment.count({ where: { deletedAt: null } }),
      this.prisma.deployment.count({
        where: { deletedAt: null, status: DeploymentStatus.SUCCESS },
      }),
    ]);

    const deploymentSuccessRate =
      totalDeployments > 0
        ? Math.round((successfulDeployments / totalDeployments) * 1000) / 10
        : 100;

    return {
      totalOrganizations,
      totalProjects,
      totalEnvironments,
      totalPipelineDefinitions,
      totalPipelineRuns,
      totalDeployments,
      deploymentSuccessRate,
    };
  }

  /**
   * Formats platform system metrics into standard Prometheus Exposition text format (version 0.0.4).
   */
  async getPrometheusMetricsText(): Promise<string> {
    const metrics = await this.getSystemMetrics();
    const uptimeSeconds = Math.round(process.uptime());
    const memUsage = process.memoryUsage();
    const cpuCount = os.cpus().length;
    const freeMem = os.freemem();
    const totalMem = os.totalmem();

    const [successfulRuns, failedRuns, runningRuns, queuedRuns] = await Promise.all([
      this.prisma.pipelineRun.count({ where: { status: 'SUCCESS', deletedAt: null } }),
      this.prisma.pipelineRun.count({ where: { status: 'FAILED', deletedAt: null } }),
      this.prisma.pipelineRun.count({ where: { status: 'RUNNING', deletedAt: null } }),
      this.prisma.pipelineRun.count({ where: { status: 'QUEUED', deletedAt: null } }),
    ]);

    return [
      '# HELP opspilot_uptime_seconds Total backend process uptime in seconds',
      '# TYPE opspilot_uptime_seconds counter',
      `opspilot_uptime_seconds ${uptimeSeconds}`,
      '',
      '# HELP opspilot_organizations_total Total registered active organizations',
      '# TYPE opspilot_organizations_total gauge',
      `opspilot_organizations_total ${metrics.totalOrganizations}`,
      '',
      '# HELP opspilot_projects_total Total registered active projects',
      '# TYPE opspilot_projects_total gauge',
      `opspilot_projects_total ${metrics.totalProjects}`,
      '',
      '# HELP opspilot_environments_total Total managed deployment environments',
      '# TYPE opspilot_environments_total gauge',
      `opspilot_environments_total ${metrics.totalEnvironments}`,
      '',
      '# HELP opspilot_pipeline_runs_total Total executed pipeline runs',
      '# TYPE opspilot_pipeline_runs_total counter',
      `opspilot_pipeline_runs_total ${metrics.totalPipelineRuns}`,
      '',
      '# HELP opspilot_pipeline_runs_success_total Total successful pipeline runs',
      '# TYPE opspilot_pipeline_runs_success_total counter',
      `opspilot_pipeline_runs_success_total ${successfulRuns}`,
      '',
      '# HELP opspilot_pipeline_runs_failed_total Total failed pipeline runs',
      '# TYPE opspilot_pipeline_runs_failed_total counter',
      `opspilot_pipeline_runs_failed_total ${failedRuns}`,
      '',
      '# HELP opspilot_queue_running_jobs Currently executing pipeline run jobs',
      '# TYPE opspilot_queue_running_jobs gauge',
      `opspilot_queue_running_jobs ${runningRuns}`,
      '',
      '# HELP opspilot_queue_waiting_jobs Currently queued waiting pipeline run jobs',
      '# TYPE opspilot_queue_waiting_jobs gauge',
      `opspilot_queue_waiting_jobs ${queuedRuns}`,
      '',
      '# HELP opspilot_deployments_total Total executed deployments',
      '# TYPE opspilot_deployments_total counter',
      `opspilot_deployments_total ${metrics.totalDeployments}`,
      '',
      '# HELP opspilot_deployment_success_rate Deployment success rate percentage',
      '# TYPE opspilot_deployment_success_rate gauge',
      `opspilot_deployment_success_rate ${metrics.deploymentSuccessRate}`,
      '',
      '# HELP opspilot_process_memory_rss_bytes Process RSS memory footprint in bytes',
      '# TYPE opspilot_process_memory_rss_bytes gauge',
      `opspilot_process_memory_rss_bytes ${memUsage.rss}`,
      '',
      '# HELP opspilot_system_cpu_count Total system CPU cores',
      '# TYPE opspilot_system_cpu_count gauge',
      `opspilot_system_cpu_count ${cpuCount}`,
      '',
      '# HELP opspilot_system_memory_free_bytes Total free system memory in bytes',
      '# TYPE opspilot_system_memory_free_bytes gauge',
      `opspilot_system_memory_free_bytes ${freeMem}`,
      '',
      '# HELP opspilot_system_memory_total_bytes Total system memory in bytes',
      '# TYPE opspilot_system_memory_total_bytes gauge',
      `opspilot_system_memory_total_bytes ${totalMem}`,
      '',
    ].join('\n');
  }
}
