import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

export interface PlanLimits {
  name: string;
  price: string;
  maxBuildMinutes: number;
  maxDeployments: number;
  maxArtifactStorageMB: number;
  maxTeamSeats: number;
  aiRcaEnabled: boolean;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  amount: string;
  status: 'PAID' | 'PENDING' | 'VOID';
  date: string;
  pdfUrl?: string;
}

export const PLAN_CONFIGS: Record<string, PlanLimits> = {
  STARTER: {
    name: 'Starter',
    price: '$0',
    maxBuildMinutes: 100,
    maxDeployments: 50,
    maxArtifactStorageMB: 1024, // 1GB
    maxTeamSeats: 3,
    aiRcaEnabled: false,
  },
  PRO: {
    name: 'Pro',
    price: '$29',
    maxBuildMinutes: 10000,
    maxDeployments: 1000,
    maxArtifactStorageMB: 51200, // 50GB
    maxTeamSeats: 15,
    aiRcaEnabled: true,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: '$199',
    maxBuildMinutes: 100000,
    maxDeployments: 10000,
    maxArtifactStorageMB: 512000, // 500GB
    maxTeamSeats: 100,
    aiRcaEnabled: true,
  },
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscriptionAndUsage(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: true,
        projects: {
          include: {
            pipelineDefinitions: {
              include: {
                runs: {
                  include: { artifacts: true },
                },
              },
            },
            environments: {
              include: { deployments: true },
            },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization '${orgId}' not found`);
    }

    const currentPlanKey = 'STARTER';
    const limits = PLAN_CONFIGS[currentPlanKey];

    // Compute actual current usage metrics
    const totalTeamSeats = org.members.length;
    let totalBuildMinutes = 0;
    let totalDeployments = 0;
    let artifactStorageMB = 0;

    for (const p of org.projects) {
      for (const pipe of p.pipelineDefinitions) {
        for (const run of pipe.runs) {
          totalBuildMinutes += Math.ceil((run.durationSeconds ?? 0) / 60);
          if (run.artifacts && Array.isArray(run.artifacts)) {
            for (const a of run.artifacts) {
              artifactStorageMB += Math.round(Number(a.sizeBytes) / (1024 * 1024));
            }
          }
        }
      }
      for (const env of p.environments) {
        totalDeployments += env.deployments.length;
      }
    }

    return {
      organizationId: org.id,
      plan: limits,
      usage: {
        buildMinutes: totalBuildMinutes,
        buildMinutesLimit: limits.maxBuildMinutes,
        buildMinutesPercent: Math.min(
          100,
          Math.round((totalBuildMinutes / limits.maxBuildMinutes) * 100),
        ),
        deployments: totalDeployments,
        deploymentsLimit: limits.maxDeployments,
        deploymentsPercent: Math.min(
          100,
          Math.round((totalDeployments / limits.maxDeployments) * 100),
        ),
        artifactStorageMB,
        artifactStorageLimitMB: limits.maxArtifactStorageMB,
        artifactStoragePercent: Math.min(
          100,
          Math.round((artifactStorageMB / limits.maxArtifactStorageMB) * 100),
        ),
        teamSeats: totalTeamSeats,
        teamSeatsLimit: limits.maxTeamSeats,
        teamSeatsPercent: Math.min(100, Math.round((totalTeamSeats / limits.maxTeamSeats) * 100)),
      },
    };
  }

  async createCheckoutSession(orgId: string, plan: string) {
    if (!PLAN_CONFIGS[plan.toUpperCase()]) {
      throw new BadRequestException(`Invalid subscription plan: '${plan}'`);
    }

    return {
      checkoutUrl: `https://billing.opspilot.ai/checkout?orgId=${orgId}&plan=${plan.toLowerCase()}&session=cs_test_${Date.now()}`,
      sessionId: `cs_test_${Date.now()}`,
      plan: PLAN_CONFIGS[plan.toUpperCase()],
    };
  }

  async getInvoices(orgId: string): Promise<InvoiceRecord[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException(`Organization '${orgId}' not found`);
    }
    return [];
  }
}
