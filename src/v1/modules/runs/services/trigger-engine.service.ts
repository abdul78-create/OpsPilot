import { Injectable } from '@nestjs/common';
import { TriggerType } from '@prisma/client';

export interface TriggerRunRequest {
  pipelineDefinitionId: string;
  pipelineVersionId: string;
  triggerType: TriggerType;
  triggeredBy: string;
  commitSha?: string | null;
  branch?: string | null;
}

@Injectable()
export class TriggerEngineService {
  normalizeTriggerRequest(
    pipelineDefinitionId: string,
    pipelineVersionId: string,
    triggerType: TriggerType,
    triggeredBy: string,
    options?: { commitSha?: string | null; branch?: string | null },
  ): TriggerRunRequest {
    return {
      pipelineDefinitionId,
      pipelineVersionId,
      triggerType: triggerType || TriggerType.MANUAL,
      triggeredBy: triggeredBy || 'system',
      // Keep null/undefined — do NOT substitute 'head' as a fake SHA
      commitSha: options?.commitSha || null,
      branch: options?.branch || null,
    };
  }
}
