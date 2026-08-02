import { Injectable, BadRequestException } from '@nestjs/common';
import { PipelineRunStatus, JobStatus } from '@prisma/client';

const VALID_RUN_TRANSITIONS: Record<PipelineRunStatus, PipelineRunStatus[]> = {
  [PipelineRunStatus.QUEUED]: [PipelineRunStatus.RUNNING, PipelineRunStatus.CANCELLED],
  [PipelineRunStatus.RUNNING]: [
    PipelineRunStatus.SUCCESS,
    PipelineRunStatus.FAILED,
    PipelineRunStatus.CANCELLED,
    PipelineRunStatus.TIMEOUT,
  ],
  [PipelineRunStatus.SUCCESS]: [],
  [PipelineRunStatus.FAILED]: [],
  [PipelineRunStatus.CANCELLED]: [],
  [PipelineRunStatus.TIMEOUT]: [],
};

const VALID_JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.QUEUED]: [JobStatus.RUNNING, JobStatus.SKIPPED, JobStatus.CANCELLED],
  [JobStatus.RUNNING]: [JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELLED],
  [JobStatus.SUCCESS]: [],
  [JobStatus.FAILED]: [],
  [JobStatus.SKIPPED]: [],
  [JobStatus.CANCELLED]: [],
};

@Injectable()
export class StateMachineService {
  assertValidRunTransition(current: PipelineRunStatus, next: PipelineRunStatus): void {
    const allowed = VALID_RUN_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid Pipeline Run status transition: '${current}' → '${next}'. Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }
  }

  assertValidJobTransition(current: JobStatus, next: JobStatus): void {
    const allowed = VALID_JOB_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid Pipeline Job status transition: '${current}' → '${next}'. Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }
  }

  isTerminalRunStatus(status: PipelineRunStatus): boolean {
    return (
      [
        PipelineRunStatus.SUCCESS,
        PipelineRunStatus.FAILED,
        PipelineRunStatus.CANCELLED,
        PipelineRunStatus.TIMEOUT,
      ] as PipelineRunStatus[]
    ).includes(status);
  }

  isTerminalJobStatus(status: JobStatus): boolean {
    return (
      [JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.SKIPPED, JobStatus.CANCELLED] as JobStatus[]
    ).includes(status);
  }
}
