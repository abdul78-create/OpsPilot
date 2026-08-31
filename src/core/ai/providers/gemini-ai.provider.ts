import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class GeminiAiProvider implements IAiProvider {
  private readonly logger = new Logger(GeminiAiProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string | null {
    return (
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_AI_KEY') ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_KEY ||
      null
    );
  }

  private cleanJsonString(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '');
    }
    return clean.trim();
  }

  async analyzeRunFailure(context: RunAnalysisContext): Promise<AnalysisResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.logger.warn('AI Root Cause Analysis requested but GEMINI_API_KEY is not configured.');
      throw new ServiceUnavailableException(
        'AI Root Cause Analysis unavailable: AI provider is not configured. Configure GEMINI_API_KEY to enable automated RCA.',
      );
    }

    // Safely truncate logs per job to prevent token overflow
    const sanitizedJobs = context.failedJobs.map((j) => {
      const logs = j.logs || [];
      const truncatedLogs = logs.length > 40 ? [...logs.slice(0, 20), ...logs.slice(-20)] : logs;
      return {
        id: j.id,
        name: j.name,
        stage: j.stage,
        logs: truncatedLogs.map((l) => ({ level: l.level, message: l.message })),
      };
    });

    const prompt = `You are an expert DevOps engineer and AI Root Cause Analysis specialist.
Analyze the following failed pipeline run logs and determine the root cause, confidence score (0.0 to 1.0), risk level (LOW, MEDIUM, HIGH, CRITICAL), actionable remediation steps, and concrete fix proposals (suggested CLI commands and unified git patch diff).

Pipeline: "${context.pipelineName}" (Run ID: ${context.runId})
Branch: ${context.branch ?? 'main'}, Commit: ${context.commitSha ?? 'unknown'}

Failed Jobs & Log Snippets:
${JSON.stringify(sanitizedJobs, null, 2)}

Respond strictly in valid JSON format matching this schema:
{
  "summary": "Short 1-2 sentence executive summary of failure",
  "rootCause": "Exact technical reason for failure",
  "confidenceScore": 0.95,
  "riskLevel": "HIGH",
  "recommendations": [
    "Step 1 fix suggestion",
    "Step 2 fix suggestion"
  ],
  "suggestedCommands": [
    "npm install"
  ],
  "suggestedPatch": "--- a/file\\n+++ b/file\\n@@ ..."
}`;

    let lastError: Error | null = null;
    // Retry loop (up to 2 attempts for transient errors)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
          },
        );

        if (!res.ok) {
          const statusText = await res.text().catch(() => '');
          this.logger.warn(
            `Gemini API returned HTTP ${res.status} (attempt ${attempt}/2): ${statusText}`,
          );
          if (attempt === 2) {
            throw new ServiceUnavailableException(
              `AI Root Cause Analysis unavailable: Gemini API returned HTTP ${res.status}. Check API quota and credentials.`,
            );
          }
          continue;
        }

        const rawJson = await res.json();
        const textResponse = rawJson.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new ServiceUnavailableException(
            'AI Root Cause Analysis unavailable: Gemini API returned empty response.',
          );
        }

        const cleaned = this.cleanJsonString(textResponse);
        const parsed = JSON.parse(cleaned);

        const riskLevel = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.riskLevel)
          ? (parsed.riskLevel as AiRiskLevel)
          : AiRiskLevel.MEDIUM;

        return {
          summary: parsed.summary || `AI RCA for Pipeline Run '${context.pipelineName}'`,
          rootCause: parsed.rootCause || 'Job execution failure in pipeline steps.',
          confidenceScore:
            typeof parsed.confidenceScore === 'number'
              ? Math.min(Math.max(parsed.confidenceScore, 0), 1)
              : 0.9,
          riskLevel,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          suggestedCommands: Array.isArray(parsed.suggestedCommands)
            ? parsed.suggestedCommands
            : undefined,
          suggestedPatch:
            typeof parsed.suggestedPatch === 'string' ? parsed.suggestedPatch : undefined,
        };
      } catch (err) {
        lastError = err as Error;
        this.logger.error(
          `Gemini AI analysis error (attempt ${attempt}): ${(err as Error).message}`,
        );
        if (err instanceof ServiceUnavailableException) {
          throw err;
        }
      }
    }

    throw new ServiceUnavailableException(
      `AI Root Cause Analysis unavailable: ${lastError?.message || 'AI provider request failed.'}`,
    );
  }

  async scoreDeploymentRisk(context: DeploymentRiskContext): Promise<RiskScoreResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      // Transparent deterministic scoring based strictly on real configuration & historical failure rate
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
        recommendations.push(
          'Obtain remaining required manual approvals before triggering release.',
        );
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
        recommendations.push('Standard deployment safety checks passed.');
      }

      return {
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        summary: `Deployment Risk Score: ${Math.min(riskScore, 100)}/100 (${riskLevel}) for ${context.environmentName}`,
        riskFactors,
        recommendations,
      };
    }

    const prompt = `You are a DevOps release risk specialist.
Evaluate the risk of deploying release "${context.releaseVersion || 'latest'}" to environment "${context.environmentName}" (${context.environmentType}).
Approval Count: ${context.approvalCount}/${context.minApprovers} required.
Recent failure rate in environment: ${context.recentFailureRatePercent}%.

Respond strictly in valid JSON format:
{
  "riskScore": 45,
  "riskLevel": "MEDIUM",
  "summary": "Evaluation summary",
  "riskFactors": ["factor 1"],
  "recommendations": ["recommendation 1"]
}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        },
      );

      if (res.ok) {
        const rawJson = await res.json();
        const textResponse = rawJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          const parsed = JSON.parse(this.cleanJsonString(textResponse));
          const riskLevel = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.riskLevel)
            ? (parsed.riskLevel as AiRiskLevel)
            : AiRiskLevel.MEDIUM;
          return {
            riskScore:
              typeof parsed.riskScore === 'number'
                ? Math.min(Math.max(parsed.riskScore, 0), 100)
                : 50,
            riskLevel,
            summary: parsed.summary || `Deployment Risk for ${context.environmentName}`,
            riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          };
        }
      }
    } catch (err) {
      this.logger.warn(
        `Gemini deployment risk scoring fallback to deterministic evaluation: ${(err as Error).message}`,
      );
    }

    return {
      riskScore: context.environmentType === 'PRODUCTION' ? 50 : 20,
      riskLevel: context.environmentType === 'PRODUCTION' ? AiRiskLevel.MEDIUM : AiRiskLevel.LOW,
      summary: `Deployment Risk Score for ${context.environmentName}`,
      riskFactors: [`Environment: ${context.environmentType}`],
      recommendations: ['Follow standard deployment rollout procedures.'],
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
