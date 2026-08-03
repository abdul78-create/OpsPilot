import {
  Controller,
  Get,
  Post,
  Param,
  Sse,
  UseGuards,
  HttpStatus,
  NotFoundException,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { LogsService } from './logs.service';
import { LogEntryResponseDto } from './dto/log-entry-response.dto';
import { PrismaService } from '../../../core/database/prisma.service';
import { PipelineRunStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { PipelinePermissions } from '@shared/constants/permissions.constants';

@ApiTags('Log Streaming')
@ApiBearerAuth()
@Controller('pipeline-runs')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly prisma: PrismaService,
  ) {}

  @Sse(':runId/logs/stream')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({
    summary: 'Stream real-time pipeline run execution logs via Server-Sent Events (SSE)',
  })
  @ApiParam({ name: 'runId', description: 'Pipeline Run UUID' })
  streamLogs(@Param('runId') runId: string): Observable<MessageEvent> {
    return this.logsService.streamLogs(runId);
  }

  @Get(':runId/logs')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Retrieve historical logs for a pipeline run' })
  @ApiParam({ name: 'runId', description: 'Pipeline Run UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [LogEntryResponseDto] })
  async getHistoricalLogs(@Param('runId') runId: string) {
    const logs = await this.logsService.getHistoricalLogs(runId);
    return {
      message: 'Pipeline run logs retrieved successfully',
      data: logs,
    };
  }

  @Post(':runId/cancel')
  @Permissions(PipelinePermissions.CANCEL)
  @ApiOperation({ summary: 'Cancel an active pipeline run execution' })
  @ApiParam({ name: 'runId', description: 'Pipeline Run UUID' })
  async cancelRun(@Param('runId') runId: string) {
    const run = await this.prisma.pipelineRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new NotFoundException(`Pipeline run '${runId}' not found`);
    }

    const updated = await this.prisma.pipelineRun.update({
      where: { id: runId },
      data: { status: PipelineRunStatus.CANCELLED, finishedAt: new Date() },
    });

    return {
      message: `Pipeline run '${runId}' successfully cancelled`,
      data: updated,
    };
  }
}
