import { Injectable } from '@nestjs/common';
import {
  IAiProvider,
  RunAnalysisContext,
  DeploymentRiskContext,
  AnalysisResult,
  RiskScoreResult,
  OptimizationResult,
  SecurityAuditResult,
} from '../interfaces/ai-provider.interface';
import { AiRiskLevel } from '@prisma/client';

@Injectable()
export class RuleBasedAiProvider implements IAiProvider {
  async analyzeRunFailure(context: RunAnalysisContext): Promise<AnalysisResult> {
    const failedJobNames = context.failedJobs.map((j) => j.name).join(', ');
    const allLogMessages = context.failedJobs
      .flatMap((j) => j.logs.map((l) => l.message))
      .join(' \n ');

    let rootCause = `Job execution failed in stage(s): ${failedJobNames}.`;
    let confidenceScore = 0.85;
    let riskLevel: AiRiskLevel = AiRiskLevel.MEDIUM;
    const recommendations: string[] = [];

    if (
      allLogMessages.toLowerCase().includes('permission denied') ||
      allLogMessages.toLowerCase().includes('eacces')
    ) {
      rootCause = `File system or binary permission failure during execution.`;
      confidenceScore = 0.95;
      riskLevel = AiRiskLevel.HIGH;
      recommendations.push('Check file execution flags and runner process UID privileges.');
      recommendations.push(
        'Ensure required scripts have `chmod +x` permissions in build workflow.',
      );
    } else if (
      allLogMessages.toLowerCase().includes('timeout') ||
      allLogMessages.toLowerCase().includes('timed out')
    ) {
      rootCause = `Job step exceeded execution timeout limit.`;
      confidenceScore = 0.9;
      riskLevel = AiRiskLevel.MEDIUM;
      recommendations.push(
        'Increase step timeout configuration or split heavy build tasks into parallel jobs.',
      );
    } else if (
      allLogMessages.toLowerCase().includes('syntaxerror') ||
      allLogMessages.toLowerCase().includes('cannot find module')
    ) {
      rootCause = `Dependency or syntax compilation failure in source code.`;
      confidenceScore = 0.95;
      riskLevel = AiRiskLevel.LOW;
      recommendations.push('Verify lockfile integrity (`package-lock.json` or `yarn.lock`).');
      recommendations.push('Run `npm ci` locally to reproduce build resolution failure.');
    } else {
      recommendations.push('Review detailed step execution logs for unhandled exception trace.');
      recommendations.push(
        'Ensure environment variables and secret dependencies are defined in target environment.',
      );
    }

    return {
      summary: `Automated Root Cause Analysis for Pipeline Run failure on '${context.pipelineName}'`,
      rootCause,
      confidenceScore,
      riskLevel,
      recommendations,
    };
  }

  async scoreDeploymentRisk(context: DeploymentRiskContext): Promise<RiskScoreResult> {
    let riskScore = 10;
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (context.environmentType === 'PRODUCTION') {
      riskScore += 40;
      riskFactors.push('Target environment is PRODUCTION.');
    } else if (context.environmentType === 'STAGING') {
      riskScore += 20;
      riskFactors.push('Target environment is STAGING.');
    }

    if (context.requiresApproval && context.approvalCount < context.minApprovers) {
      riskScore += 30;
      riskFactors.push(
        `Insufficient approvals: ${context.approvalCount}/${context.minApprovers} acquired.`,
      );
      recommendations.push('Obtain remaining required manual approvals before triggering release.');
    }

    if (context.recentFailureRatePercent > 25) {
      riskScore += 25;
      riskFactors.push(
        `High recent deployment failure rate (${context.recentFailureRatePercent}%).`,
      );
      recommendations.push(
        'Perform additional staging verification or smoke testing prior to release.',
      );
    }

    let riskLevel: AiRiskLevel = AiRiskLevel.LOW;
    if (riskScore >= 75) {
      riskLevel = AiRiskLevel.CRITICAL;
    } else if (riskScore >= 50) {
      riskLevel = AiRiskLevel.HIGH;
    } else if (riskScore >= 25) {
      riskLevel = AiRiskLevel.MEDIUM;
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Standard deployment safety checks passed. Proceed with automated release.',
      );
    }

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      summary: `Deployment Risk Score: ${Math.min(riskScore, 100)}/100 (${riskLevel}) for ${context.environmentName}`,
      riskFactors,
      recommendations,
    };
  }

  async recommendOptimizations(
    jobDurations: { jobName: string; stage: string; avgDurationSeconds: number }[],
  ): Promise<OptimizationResult> {
    const recommendations: string[] = [];
    let potentialTimeSavingsSeconds = 0;

    const slowJobs = jobDurations.filter((j) => j.avgDurationSeconds > 120);

    for (const job of slowJobs) {
      potentialTimeSavingsSeconds += Math.round(job.avgDurationSeconds * 0.3);
      recommendations.push(
        `Cache dependency directories for job '${job.jobName}' in stage '${job.stage}' to reduce avg build duration (~${job.avgDurationSeconds}s).`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Pipeline stage execution times are within optimal thresholds (<120s per job).',
      );
    }

    return {
      summary: `Pipeline performance optimization scan evaluated ${jobDurations.length} job types`,
      potentialTimeSavingsSeconds,
      recommendations,
    };
  }

  async auditSecurity(
    logsAndConfigs: { source: string; content: string }[],
  ): Promise<SecurityAuditResult> {
    const vulnerabilitiesFound: string[] = [];
    const recommendations: string[] = [];

    for (const item of logsAndConfigs) {
      if (
        item.content.includes('BEGIN PRIVATE KEY') ||
        item.content.match(/AKIA[0-9A-Z]{16}/) ||
        item.content.includes('ghp_')
      ) {
        vulnerabilitiesFound.push(`Potential credential leak detected in ${item.source}`);
        recommendations.push(
          `Revoke exposed secret in ${item.source} and replace with OpsPilot Secret Management.`,
        );
      }
    }

    const riskLevel = vulnerabilitiesFound.length > 0 ? AiRiskLevel.CRITICAL : AiRiskLevel.LOW;

    if (vulnerabilitiesFound.length === 0) {
      recommendations.push('No plaintext secret exposures detected in target configurations/logs.');
    }

    return {
      summary: `Security audit scanned ${logsAndConfigs.length} configuration/log sources`,
      riskLevel,
      vulnerabilitiesFound,
      recommendations,
    };
  }
}
