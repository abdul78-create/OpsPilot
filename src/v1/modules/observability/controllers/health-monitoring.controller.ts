import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthMonitoringService } from '../services/health-monitoring.service';
import { HealthStatusResponseDto } from '../dto/health-status-response.dto';

@ApiTags('Observability — Health')
@Controller('health')
export class HealthMonitoringController {
  constructor(private readonly healthMonitoringService: HealthMonitoringService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve platform health status and database connectivity check' })
  @ApiResponse({ status: HttpStatus.OK, type: HealthStatusResponseDto })
  async getHealth() {
    return this.healthMonitoringService.getHealth();
  }
}
