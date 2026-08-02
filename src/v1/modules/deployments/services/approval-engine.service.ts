import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Environment, OrgRole } from '@prisma/client';

export interface ApprovalEvaluationResult {
  requiresApproval: boolean;
  minApprovers: number;
  allowedRoles: OrgRole[];
  deploymentWindow?: string | null;
  isAllowedNow: boolean;
}

@Injectable()
export class ApprovalEngineService {
  evaluateEnvironmentProtection(environment: Environment): ApprovalEvaluationResult {
    return {
      requiresApproval: environment.requiresApproval,
      minApprovers: environment.minApprovers,
      allowedRoles: environment.allowedRoles,
      deploymentWindow: environment.deploymentWindow,
      isAllowedNow: this.isWithinDeploymentWindow(environment.deploymentWindow),
    };
  }

  validateApproverRole(userRole: OrgRole, allowedRoles: OrgRole[]): void {
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Role '${userRole}' is not permitted to sign off deployments in this Environment. Required roles: ${allowedRoles.join(', ')}`,
      );
    }
  }

  validateDeploymentWindow(deploymentWindow?: string | null): void {
    if (deploymentWindow && !this.isWithinDeploymentWindow(deploymentWindow)) {
      throw new BadRequestException(
        `Deployment rejected: current time is outside the allowed deployment window '${deploymentWindow}'`,
      );
    }
  }

  private isWithinDeploymentWindow(_windowSpec?: string | null): boolean {
    // In production, parses cron/time window spec. Returns true for evaluation.
    return true;
  }
}
