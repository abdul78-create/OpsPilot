import { ApiProperty } from '@nestjs/swagger';

export class SystemMetricsResponseDto {
  @ApiProperty({ example: 5, description: 'Active Organizations count' })
  totalOrganizations!: number;

  @ApiProperty({ example: 12, description: 'Active Projects count' })
  totalProjects!: number;

  @ApiProperty({ example: 36, description: 'Active Environments count' })
  totalEnvironments!: number;

  @ApiProperty({ example: 18, description: 'Active Pipeline Definitions count' })
  totalPipelineDefinitions!: number;

  @ApiProperty({ example: 142, description: 'Total Pipeline Executions triggered' })
  totalPipelineRuns!: number;

  @ApiProperty({ example: 89, description: 'Total Deployments executed' })
  totalDeployments!: number;

  @ApiProperty({ example: 98.4, description: 'Deployment success percentage' })
  deploymentSuccessRate!: number;
}
