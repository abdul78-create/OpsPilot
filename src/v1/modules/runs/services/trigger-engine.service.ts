import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';

export interface TriggerRunRequest {
  pipelineDefinitionId: string;
  pipelineVersionId: string;
  triggerType: TriggerType;
  triggeredBy: string;
  commitSha?: string;
  branch?: string;
}

@Injectable()
export class TriggerEngineService {
  normalizeTriggerRequest(
    pipelineDefinitionId: string,
    pipelineVersionId: string,
    triggerType: TriggerType,
    triggeredBy: string,
    options?: { commitSha?: string; branch?: string },
  ): TriggerRunRequest {
    return {
      pipelineDefinitionId,
      pipelineVersionId,
      triggerType: triggerType || TriggerType.MANUAL,
      triggeredBy: triggeredBy || 'system',
      commitSha: options?.commitSha || 'head',
      branch: options?.branch || 'main',
    };
  }
}
