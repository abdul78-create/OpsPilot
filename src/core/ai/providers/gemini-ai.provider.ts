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
      this.logger.log(
        'No GEMINI_API_KEY detected. Using structured rule-based AI diagnostic fallback.',
      );
      return this.fallbackProvider.analyzeRunFailure(context);
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
          this.logger.warn(`Gemini API returned HTTP ${res.status} (attempt ${attempt}/2).`);
          if (attempt === 2) {
            return this.fallbackProvider.analyzeRunFailure(context);
          }
          continue;
        }

        const rawJson = await res.json();
        const textResponse = rawJson.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
          return this.fallbackProvider.analyzeRunFailure(context);
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
        this.logger.error(
          `Gemini AI analysis error (attempt ${attempt}): ${(err as Error).message}`,
        );
        if (attempt === 2) {
          return this.fallbackProvider.analyzeRunFailure(context);
        }
      }
    }

    return this.fallbackProvider.analyzeRunFailure(context);
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
