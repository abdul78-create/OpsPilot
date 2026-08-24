import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FlakyTestsRepository } from './flaky-tests.repository';
import { RecordTestResultDto } from './dto/record-test-result.dto';
import { QuarantineTestDto } from './dto/quarantine-test.dto';
import { FlakyTestRecord } from '@prisma/client';

export interface TestRecordResult {
  record: FlakyTestRecord;
  isFlaky: boolean;
  quarantineRecommended: boolean;
}

@Injectable()
export class FlakyTestsService {
  private readonly logger = new Logger(FlakyTestsService.name);

  constructor(private readonly flakyTestsRepo: FlakyTestsRepository) {}

  async recordResult(organizationId: string, dto: RecordTestResultDto): Promise<TestRecordResult> {
    const existing = await this.flakyTestsRepo.findByTest(
      dto.projectId,
      dto.testSuite,
      dto.testName,
    );

    let record: FlakyTestRecord;

    if (existing) {
      const totalRuns = existing.totalRuns + 1;
      const failureCount = dto.passed ? existing.failureCount : existing.failureCount + 1;
      const flakinessScore = Number(((failureCount / totalRuns) * 100).toFixed(2));

      record = await this.flakyTestsRepo.update(existing.id, {
        totalRuns,
        failureCount,
        flakinessScore,
        lastFailureRunId: dto.passed
          ? existing.lastFailureRunId
          : (dto.runId ?? existing.lastFailureRunId),
        lastFailureMessage: dto.passed
          ? existing.lastFailureMessage
          : (dto.errorMessage ?? existing.lastFailureMessage),
      });
    } else {
      const totalRuns = 1;
      const failureCount = dto.passed ? 0 : 1;
      const flakinessScore = dto.passed ? 0.0 : 100.0;

      record = await this.flakyTestsRepo.create({
        organization: { connect: { id: organizationId } },
        project: { connect: { id: dto.projectId } },
        testSuite: dto.testSuite,
        testName: dto.testName,
        totalRuns,
        failureCount,
        flakinessScore,
        lastFailureRunId: dto.runId,
        lastFailureMessage: dto.errorMessage,
      });
    }

    const isFlaky =
      record.flakinessScore > 0 && record.flakinessScore < 100 && record.totalRuns >= 2;
    const quarantineRecommended =
      (record.flakinessScore >= 30.0 && record.totalRuns >= 3) || record.flakinessScore > 50.0;

    this.logger.log(
      `Test Recorded [${dto.testSuite} > ${dto.testName}]: Flakiness=${record.flakinessScore}% (${record.failureCount}/${record.totalRuns}), Quarantined=${record.isQuarantined}`,
    );

    return {
      record,
      isFlaky,
      quarantineRecommended,
    };
  }

  async list(organizationId: string, projectId?: string): Promise<FlakyTestRecord[]> {
    if (projectId) {
      return this.flakyTestsRepo.findByProject(projectId);
    }
    return this.flakyTestsRepo.findByOrganization(organizationId);
  }

  async getQuarantined(projectId: string): Promise<FlakyTestRecord[]> {
    return this.flakyTestsRepo.findQuarantinedByProject(projectId);
  }

  async getById(id: string): Promise<FlakyTestRecord> {
    const record = await this.flakyTestsRepo.findById(id);
    if (!record) {
      throw new NotFoundException(`Flaky test record '${id}' not found.`);
    }
    return record;
  }

  async toggleQuarantine(
    id: string,
    dto: QuarantineTestDto,
    quarantinedBy: string = 'SYSTEM',
  ): Promise<FlakyTestRecord> {
    const existing = await this.getById(id);
    return this.flakyTestsRepo.update(existing.id, {
      isQuarantined: dto.isQuarantined,
      quarantinedAt: dto.isQuarantined ? new Date() : null,
      quarantinedBy: dto.isQuarantined ? quarantinedBy : null,
    });
  }
}
