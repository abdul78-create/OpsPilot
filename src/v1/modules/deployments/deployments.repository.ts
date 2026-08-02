import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { Deployment, DeploymentApproval, Prisma } from '@prisma/client';

@Injectable()
export class DeploymentsRepository extends BaseRepository<
  Deployment,
  Prisma.DeploymentCreateInput,
  Prisma.DeploymentUpdateInput
> {
  constructor(prismaService: PrismaService) {
    super(prismaService, 'deployment');
  }

  async findEnvironmentDeployments(environmentId: string): Promise<Deployment[]> {
    return this.prismaService.deployment.findMany({
      where: { environmentId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        approvals: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findDeploymentDetails(id: string): Promise<Deployment | null> {
    return this.prismaService.deployment.findFirst({
      where: { id, deletedAt: null },
      include: {
        approvals: { orderBy: { createdAt: 'asc' } },
        environment: true,
        pipelineRun: true,
      },
    });
  }

  async createApproval(data: Prisma.DeploymentApprovalCreateInput): Promise<DeploymentApproval> {
    return this.prismaService.deploymentApproval.create({ data });
  }

  async findApprovals(deploymentId: string): Promise<DeploymentApproval[]> {
    return this.prismaService.deploymentApproval.findMany({
      where: { deploymentId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
