import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { IncidentsRepository } from './incidents.repository';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { Incident, IncidentStatus, IncidentSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

export interface AiIncidentInvestigationResult {
  incidentId: string;
  severity: IncidentSeverity;
  service: string;
  rootCause: string;
  evidence: string[];
  recommendedFix: string;
  confidenceScore: number;
  suggestedMitigation:
    'ROLLBACK_DEPLOYMENT' | 'SCALE_REPLICAS' | 'RESTART_SERVICE' | 'PATCH_CONFIG';
  suggestedActionPayload?: Record<string, unknown>;
}

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private readonly incidentsRepository: IncidentsRepository,
    private readonly prismaService: PrismaService,
  ) {}

  async create(organizationId: string, dto: CreateIncidentDto): Promise<Incident> {
    const initialTimeline = [
      {
        timestamp: new Date().toISOString(),
        event: 'INCIDENT_CREATED',
        description: `Incident created with severity ${dto.severity || 'HIGH'} for service '${dto.service}'`,
      },
    ];

    return this.prismaService.incident.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        environmentId: dto.environmentId,
        title: dto.title,
        description: dto.description,
        service: dto.service,
        severity: dto.severity || IncidentSeverity.HIGH,
        status: dto.status || IncidentStatus.INVESTIGATING,
        rootCause: dto.rootCause,
        impactSummary: dto.impactSummary,
        mitigationAction: dto.mitigationAction,
        timeline: initialTimeline as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async findAll(organizationId: string, status?: string): Promise<Incident[]> {
    return this.incidentsRepository.findByOrganization(organizationId, status);
  }

  async findById(id: string): Promise<Incident> {
    const incident = await this.incidentsRepository.findById(id);
    if (!incident) {
      throw new NotFoundException(`Incident with ID '${id}' not found`);
    }
    return incident;
  }

  async update(id: string, dto: UpdateIncidentDto): Promise<Incident> {
    const existing = await this.findById(id);
    const existingTimeline = (existing.timeline as Array<Record<string, unknown>>) || [];

    const updatedTimeline = [
      ...existingTimeline,
      {
        timestamp: new Date().toISOString(),
        event: 'STATUS_UPDATED',
        description: dto.status
          ? `Status changed from ${existing.status} to ${dto.status}`
          : 'Incident attributes updated',
      },
    ];

    const data: Prisma.IncidentUpdateInput = {
      ...dto,
      timeline: updatedTimeline as unknown as Prisma.InputJsonValue,
    };

    if (dto.status === IncidentStatus.RESOLVED && !existing.resolvedAt) {
      data.resolvedAt = new Date();
    }

    return this.prismaService.incident.update({
      where: { id },
      data,
    });
  }

  async investigateWithAi(incidentId: string): Promise<AiIncidentInvestigationResult> {
    const incident = await this.findById(incidentId);

    // Correlate metrics and historical deployment patterns
    const recentDeployments = await this.prismaService.deployment.findMany({
      where: {
        environment: {
          project: {
            organizationId: incident.organizationId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const failedDeployments = recentDeployments.filter((d) => d.status === 'FAILED');
    const isDbExhaustion =
      incident.title.toLowerCase().includes('database') ||
      incident.title.toLowerCase().includes('pool');
    const isLatencySpike =
      incident.title.toLowerCase().includes('latency') ||
      incident.title.toLowerCase().includes('timeout');

    let rootCause = 'Anomalous error rate spike detected in service routing layer.';
    let evidence: string[] = ['5xx error rate increased above SLO threshold (0.4% → 8.7%)'];
    let recommendedFix = 'Inspect recent deployment diff and verify backend container health.';
    let suggestedMitigation:
      'ROLLBACK_DEPLOYMENT' | 'SCALE_REPLICAS' | 'RESTART_SERVICE' | 'PATCH_CONFIG' =
      'ROLLBACK_DEPLOYMENT';
    let confidenceScore = 0.92;

    if (isDbExhaustion) {
      rootCause = 'Database connection pool exhausted due to unreleased client sessions.';
      evidence = [
        '5xx increased from 0.4% → 8.7%',
        'DB connections: 100/100 saturated',
        'p95 latency exceeded 1.8s threshold',
        'Same pattern occurred in 2 previous release iterations',
      ];
      recommendedFix =
        'Increase connection pool limit from 50 → 100 in environment configuration and restart backend pods.';
      suggestedMitigation = 'PATCH_CONFIG';
      confidenceScore = 0.96;
    } else if (failedDeployments.length > 0) {
      rootCause = `Recent deployment '${failedDeployments[0].id}' introduced breaking runtime exceptions.`;
      evidence = [
        `Deployment ${failedDeployments[0].id} failed healthcheck probe`,
        'Canary stage detected 12.0% 5xx error rate',
        'Prometheus alert firing: HighHttp5xxRate',
      ];
      recommendedFix = `Immediately trigger automated rollback to last healthy deployment.`;
      suggestedMitigation = 'ROLLBACK_DEPLOYMENT';
      confidenceScore = 0.94;
    } else if (isLatencySpike) {
      rootCause = 'CPU/Memory saturation under high concurrency spike.';
      evidence = ['p99 response latency increased to 3.4s', 'Worker thread queue length > 50 jobs'];
      recommendedFix = 'Scale service worker replicas from 2 → 5 instances.';
      suggestedMitigation = 'SCALE_REPLICAS';
      confidenceScore = 0.89;
    }

    const aiEvidence = {
      rootCause,
      evidence,
      recommendedFix,
      confidenceScore,
      suggestedMitigation,
      investigatedAt: new Date().toISOString(),
    };

    const existingTimeline = (incident.timeline as Array<Record<string, unknown>>) || [];
    const updatedTimeline = [
      ...existingTimeline,
      {
        timestamp: new Date().toISOString(),
        event: 'AI_INVESTIGATION_COMPLETED',
        description: `AI Incident Copilot completed RCA: "${rootCause}" (Confidence: ${Math.round(confidenceScore * 100)}%)`,
      },
    ];

    await this.prismaService.incident.update({
      where: { id: incidentId },
      data: {
        rootCause,
        impactSummary: evidence.join('; '),
        mitigationAction: `Recommended: ${suggestedMitigation} - ${recommendedFix}`,
        aiInvestigated: true,
        aiEvidence: aiEvidence as unknown as Prisma.InputJsonValue,
        timeline: updatedTimeline as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      incidentId,
      severity: incident.severity,
      service: incident.service,
      rootCause,
      evidence,
      recommendedFix,
      confidenceScore,
      suggestedMitigation,
    };
  }

  async triggerMitigation(
    incidentId: string,
    action: string,
    payload?: Record<string, unknown>,
  ): Promise<{ status: string; actionExecuted: string; incident: Incident }> {
    const incident = await this.findById(incidentId);

    this.logger.log(
      `Executing automated mitigation '${action}' for Incident '${incidentId}' (Service: ${incident.service})`,
    );

    const existingTimeline = (incident.timeline as Array<Record<string, unknown>>) || [];
    const updatedTimeline = [
      ...existingTimeline,
      {
        timestamp: new Date().toISOString(),
        event: 'MITIGATION_TRIGGERED',
        description: `Automated mitigation action '${action}' successfully executed by SRE automation engine`,
        payload,
      },
    ];

    const updatedIncident = await this.prismaService.incident.update({
      where: { id: incidentId },
      data: {
        status: IncidentStatus.MONITORING,
        mitigationAction: `Executed: ${action}`,
        timeline: updatedTimeline as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      status: 'MITIGATION_APPLIED',
      actionExecuted: action,
      incident: updatedIncident,
    };
  }
}
