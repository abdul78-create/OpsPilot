import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnvironmentType, OrgRole, EnvironmentConnectionStatus } from '@prisma/client';
import { DeploymentTargetType } from '../enums/deployment-target-type.enum';

export { DeploymentTargetType };

/**
 * Data Transfer Object representing an Environment entity response.
 *
 * SECURITY CONTRACT: This DTO MUST NEVER include:
 * - kubeconfig contents
 * - bearer tokens or API keys
 * - passwords or private keys
 * - encryptedValue / iv / authTag from the Secret model
 * - any raw credential material
 *
 * credentialsConfigured is a boolean presence flag only.
 * lastConnectionError contains only a safe human-readable message.
 */
export class EnvironmentResponseDto {
  @ApiProperty({ example: 'env_123456789' })
  id!: string;

  @ApiProperty({ example: 'prj_123456789' })
  projectId!: string;

  @ApiProperty({ example: 'Production US-East' })
  name!: string;

  @ApiProperty({ example: 'prod-us-east' })
  slug!: string;

  @ApiProperty({ enum: EnvironmentType, example: EnvironmentType.PRODUCTION })
  type!: EnvironmentType;

  @ApiProperty({ example: true })
  requiresApproval!: boolean;

  @ApiProperty({ example: 1 })
  minApprovers!: number;

  @ApiProperty({ enum: OrgRole, isArray: true, example: [OrgRole.OWNER, OrgRole.ADMIN] })
  allowedRoles!: OrgRole[];

  @ApiPropertyOptional({ example: 'Mon-Thu 09:00-17:00 UTC' })
  deploymentWindow?: string | null;

  @ApiProperty({ example: true })
  autoRollbackEnabled!: boolean;

  // --- Deployment Target Configuration ---

  @ApiPropertyOptional({ enum: DeploymentTargetType, example: DeploymentTargetType.KUBERNETES })
  deploymentTargetType?: DeploymentTargetType | null;

  @ApiPropertyOptional({ example: 'acme-prod-k8s' })
  clusterName?: string | null;

  @ApiPropertyOptional({ example: 'us-central1' })
  clusterRegion?: string | null;

  @ApiPropertyOptional({ example: 'acme-production' })
  k8sNamespace?: string | null;

  // --- Connection Status (safe metadata only - never includes credential values) ---

  @ApiProperty({
    enum: EnvironmentConnectionStatus,
    example: EnvironmentConnectionStatus.NOT_CONFIGURED,
    description:
      'Tracks whether the deployment target has been connected and tested. CONNECTED requires a successful test-connection call.',
  })
  connectionStatus!: EnvironmentConnectionStatus;

  @ApiProperty({
    example: false,
    description:
      'True if deployment credentials have been stored in the encrypted Secrets vault for this environment. Never returns the actual credential value.',
  })
  credentialsConfigured!: boolean;

  @ApiPropertyOptional({
    example: '2026-09-07T10:00:00.000Z',
    description: 'Timestamp of the last test-connection attempt',
  })
  lastConnectionTestedAt?: Date | null;

  @ApiPropertyOptional({
    example: 'Kubernetes credentials are not configured for this environment.',
    description:
      'Safe human-readable error from the last failed connection test. NEVER contains credential values.',
  })
  lastConnectionError?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
