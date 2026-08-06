import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiOrchestrationController } from './ai-orchestration.controller';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { RuleBasedAiProvider } from '../../../core/ai/providers/rule-based-ai.provider';
import { GeminiAiProvider } from '../../../core/ai/providers/gemini-ai.provider';

@Module({
  imports: [ConfigModule],
  controllers: [AiOrchestrationController],
  providers: [
    AiOrchestrationService,
    AiOrchestrationRepository,
    RuleBasedAiProvider,
    GeminiAiProvider,
  ],
  exports: [
    AiOrchestrationService,
    AiOrchestrationRepository,
    RuleBasedAiProvider,
    GeminiAiProvider,
  ],
})
export class AiOrchestrationModule {}
