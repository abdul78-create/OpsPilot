import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FlakyTestsService } from './flaky-tests.service';
import { RecordTestResultDto } from './dto/record-test-result.dto';
import { QuarantineTestDto } from './dto/quarantine-test.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';

@ApiTags('Flaky Test Intelligence & Quarantine')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class FlakyTestsController {
  constructor(private readonly flakyTestsService: FlakyTestsService) {}

  @Post('organizations/:organizationId/flaky-tests/record')
  @ApiOperation({ summary: 'Record test run result and update flakiness intelligence' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Test result recorded and flakiness computed',
  })
  async recordResult(
    @Param('organizationId') organizationId: string,
    @Body() dto: RecordTestResultDto,
  ) {
    const result = await this.flakyTestsService.recordResult(organizationId, dto);
    return {
      message: 'Test result analyzed and flakiness updated',
      data: result,
    };
  }

  @Get('organizations/:organizationId/flaky-tests')
  @ApiOperation({ summary: 'List flaky tests sorted by flakiness score' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Filter by Project UUID' })
  async list(
    @Param('organizationId') organizationId: string,
    @Query('projectId') projectId?: string,
  ) {
    const tests = await this.flakyTestsService.list(organizationId, projectId);
    return {
      data: tests,
    };
  }

  @Get('projects/:projectId/flaky-tests/quarantine-list')
  @ApiOperation({ summary: 'Get list of quarantined tests for non-blocking CI runs' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getQuarantined(@Param('projectId') projectId: string) {
    const quarantined = await this.flakyTestsService.getQuarantined(projectId);
    return {
      data: quarantined,
    };
  }

  @Patch('flaky-tests/:id/quarantine')
  @ApiOperation({ summary: 'Toggle quarantine state on a flaky test' })
  @ApiParam({ name: 'id', description: 'Flaky test record UUID' })
  async toggleQuarantine(
    @Param('id') id: string,
    @Body() dto: QuarantineTestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const record = await this.flakyTestsService.toggleQuarantine(id, dto, user?.email ?? 'USER');
    return {
      message: `Test quarantine status updated to ${dto.isQuarantined}`,
      data: record,
    };
  }
}
