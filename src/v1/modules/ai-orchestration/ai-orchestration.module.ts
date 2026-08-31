import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiOrchestrationController } from './ai-orchestration.controller';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { GeminiAiProvider } from '../../../core/ai/providers/gemini-ai.provider';

@Module({
  imports: [ConfigModule],
  controllers: [AiOrchestrationController],
  providers: [AiOrchestrationService, AiOrchestrationRepository, GeminiAiProvider],
  exports: [AiOrchestrationService, AiOrchestrationRepository, GeminiAiProvider],
})
export class AiOrchestrationModule {}
