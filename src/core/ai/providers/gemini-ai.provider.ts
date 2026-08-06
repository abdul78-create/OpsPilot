import { Injectable, Logger } from '@nestjs/common';
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
import { RuleBasedAiProvider } from './rule-based-ai.provider';
import { AiRiskLevel } from '@prisma/client';

@Injectable()
export class GeminiAiProvider implements IAiProvider {
  private readonly logger = new Logger(GeminiAiProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly fallbackProvider: RuleBasedAiProvider,
  ) {}

  private getApiKey(): string | null {
    return (
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('GOOGLE_AI_KEY') ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_KEY ||
      null
    );
  }

  async analyzeRunFailure(context: RunAnalysisContext): Promise<AnalysisResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.logger.log(
        'No GEMINI_API_KEY detected. Using structured rule-based AI diagnostic fallback.',
      );
      return this.fallbackProvider.analyzeRunFailure(context);
    }

    try {
      const prompt = `You are an expert DevOps engineer and AI Root Cause Analysis specialist.
Analyze the following failed pipeline run logs and determine the root cause, confidence score (0.0 to 1.0), risk level (LOW, MEDIUM, HIGH, CRITICAL), and actionable remediation steps.

Pipeline: "${context.pipelineName}" (Run ID: ${context.runId})
Branch: ${context.branch ?? 'main'}, Commit: ${context.commitSha ?? 'unknown'}

Failed Jobs & Log Snippets:
${JSON.stringify(context.failedJobs, null, 2)}

Respond strictly in valid JSON format matching this schema:
{
  "summary": "Short 1-2 sentence executive summary of failure",
  "rootCause": "Exact technical reason for failure",
  "confidenceScore": 0.95,
  "riskLevel": "HIGH",
  "recommendations": [
    "Step 1 fix suggestion",
    "Step 2 fix suggestion"
  ]
}`;

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
        this.logger.warn(
          `Gemini API returned HTTP ${res.status}. Falling back to rule-based engine.`,
        );
        return this.fallbackProvider.analyzeRunFailure(context);
      }

      const rawJson = await res.json();
      const textResponse = rawJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        return this.fallbackProvider.analyzeRunFailure(context);
      }

      const parsed = JSON.parse(textResponse);
      const riskLevel = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.riskLevel)
        ? (parsed.riskLevel as AiRiskLevel)
        : AiRiskLevel.MEDIUM;

      return {
        summary: parsed.summary || `AI RCA for Pipeline Run '${context.pipelineName}'`,
        rootCause: parsed.rootCause || 'Job execution failure in pipeline steps.',
        confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.9,
        riskLevel,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    } catch (err) {
      this.logger.error(`Gemini AI analysis exception: ${(err as Error).message}. Using fallback.`);
      return this.fallbackProvider.analyzeRunFailure(context);
    }
  }

  async scoreDeploymentRisk(context: DeploymentRiskContext): Promise<RiskScoreResult> {
    return this.fallbackProvider.scoreDeploymentRisk(context);
  }

  async recommendOptimizations(
    jobDurations: { jobName: string; stage: string; avgDurationSeconds: number }[],
  ): Promise<OptimizationResult> {
    return this.fallbackProvider.recommendOptimizations(jobDurations);
  }

  async auditSecurity(
    logsAndConfigs: { source: string; content: string }[],
  ): Promise<SecurityAuditResult> {
    return this.fallbackProvider.auditSecurity(logsAndConfigs);
  }
}
