import { Module } from '@nestjs/common';
import { AiOrchestrationController } from './ai-orchestration.controller';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { RuleBasedAiProvider } from '../../../core/ai/providers/rule-based-ai.provider';

@Module({
  controllers: [AiOrchestrationController],
  providers: [AiOrchestrationService, AiOrchestrationRepository, RuleBasedAiProvider],
  exports: [AiOrchestrationService, AiOrchestrationRepository, RuleBasedAiProvider],
})
export class AiOrchestrationModule {}
