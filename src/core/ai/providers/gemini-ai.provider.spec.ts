import { Test, TestingModule } from '@nestjs/testing';
import { GeminiAiProvider } from './gemini-ai.provider';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { AiRiskLevel, LogLevel } from '@prisma/client';

describe('GeminiAiProvider — Production Data Integrity & Mock Elimination Verification', () => {
  let provider: GeminiAiProvider;

  const mockConfigService = {
    get: jest.fn(),
  };

  const sampleContext = {
    runId: 'run_test_123',
    pipelineName: 'Production Pipeline',
    branch: 'main',
    commitSha: 'a1b2c3d4e5f6',
    failedJobs: [
      {
        id: 'job_1',
        name: 'Build Job',
        stage: 'build',
        logs: [
          {
            level: LogLevel.ERROR,
            message: 'Compilation error: cannot find module express',
            timestamp: new Date(),
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [GeminiAiProvider, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    provider = module.get<GeminiAiProvider>(GeminiAiProvider);
  });

  describe('Positive Test — Real Provider Execution', () => {
    it('should parse and return structured AI RCA when Gemini API returns valid response', async () => {
      mockConfigService.get.mockReturnValue('valid_test_api_key');

      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'Missing express dependency in production build',
                    rootCause: 'Package express is imported but not installed in package.json',
                    confidenceScore: 0.98,
                    riskLevel: 'HIGH',
                    recommendations: [
                      'Add express to package.json dependencies',
                      'Run npm install',
                    ],
                    suggestedCommands: ['npm install express'],
                    suggestedPatch: '--- a/package.json\\n+++ b/package.json',
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeminiResponse),
      }) as unknown as typeof fetch;

      const result = await provider.analyzeRunFailure(sampleContext);

      expect(result.summary).toBe('Missing express dependency in production build');
      expect(result.rootCause).toBe(
        'Package express is imported but not installed in package.json',
      );
      expect(result.confidenceScore).toBe(0.98);
      expect(result.riskLevel).toBe(AiRiskLevel.HIGH);
      expect(result.recommendations).toHaveLength(2);
      expect(result.suggestedCommands).toEqual(['npm install express']);
    });
  });

  describe('Negative Tests — Strict Mock/Fake Elimination', () => {
    it('should strictly throw ServiceUnavailableException when GEMINI_API_KEY is not configured (NO mock fallback)', async () => {
      mockConfigService.get.mockReturnValue(null);

      await expect(provider.analyzeRunFailure(sampleContext)).rejects.toThrow(
        ServiceUnavailableException,
      );

      await expect(provider.analyzeRunFailure(sampleContext)).rejects.toThrow(
        /AI provider is not configured/i,
      );
    });

    it('should strictly throw ServiceUnavailableException when Gemini API returns HTTP error (NO fake data fallback)', async () => {
      mockConfigService.get.mockReturnValue('valid_test_api_key');

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Resource has been exhausted (quota exceeded)'),
      }) as unknown as typeof fetch;

      await expect(provider.analyzeRunFailure(sampleContext)).rejects.toThrow(
        ServiceUnavailableException,
      );

      await expect(provider.analyzeRunFailure(sampleContext)).rejects.toThrow(
        /AI Root Cause Analysis unavailable/i,
      );
    });

    it('should strictly throw ServiceUnavailableException when Gemini API returns empty response (NO synthetic fallback)', async () => {
      mockConfigService.get.mockReturnValue('valid_test_api_key');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ candidates: [] }),
      }) as unknown as typeof fetch;

      await expect(provider.analyzeRunFailure(sampleContext)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should strictly throw ServiceUnavailableException when network is unreachable', async () => {
      mockConfigService.get.mockReturnValue('valid_test_api_key');

      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('Network connection timeout')) as unknown as typeof fetch;

      await expect(provider.analyzeRunFailure(sampleContext)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
