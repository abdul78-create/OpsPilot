import { AiRiskLevel, LogLevel } from '@prisma/client';

export interface RunLogSnippet {
  level: LogLevel;
  message: string;
  timestamp: Date;
}

export interface RunAnalysisContext {
  runId: string;
  pipelineName: string;
  branch?: string | null;
  commitSha?: string | null;
  failedJobs: {
    id: string;
    name: string;
    stage: string;
    logs: RunLogSnippet[];
  }[];
}

export interface DeploymentRiskContext {
  deploymentId?: string;
  environmentName: string;
  environmentType: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | 'EPHEMERAL';
  releaseVersion: string;
  requiresApproval: boolean;
  approvalCount: number;
  minApprovers: number;
  recentFailureRatePercent: number;
}

export interface AnalysisResult {
  summary: string;
  rootCause: string;
  confidenceScore: number; // 0.0 to 1.0
  riskLevel: AiRiskLevel;
  recommendations: string[];
}

export interface RiskScoreResult {
  riskScore: number; // 0 to 100
  riskLevel: AiRiskLevel;
  summary: string;
  riskFactors: string[];
  recommendations: string[];
}

export interface OptimizationResult {
  summary: string;
  potentialTimeSavingsSeconds: number;
  recommendations: string[];
}

export interface SecurityAuditResult {
  summary: string;
  riskLevel: AiRiskLevel;
  vulnerabilitiesFound: string[];
  recommendations: string[];
}

export interface IAiProvider {
  analyzeRunFailure(context: RunAnalysisContext): Promise<AnalysisResult>;
  scoreDeploymentRisk(context: DeploymentRiskContext): Promise<RiskScoreResult>;
  recommendOptimizations(
    jobDurations: { jobName: string; stage: string; avgDurationSeconds: number }[],
  ): Promise<OptimizationResult>;
  auditSecurity(
    logsAndConfigs: { source: string; content: string }[],
  ): Promise<SecurityAuditResult>;
}
