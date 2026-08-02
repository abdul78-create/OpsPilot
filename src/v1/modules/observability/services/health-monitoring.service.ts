import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../../../../core/database/prisma.service';
import { HealthStatusResponseDto } from '../dto/health-status-response.dto';

@Injectable()
export class HealthMonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getHealth(): Promise<HealthStatusResponseDto> {
    let databaseStatus = 'up';
    const eventBusStatus = 'up';
    let queueStatus = 'up';

    // Database probe
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'down';
    }

    // Redis / queue probe
    const redisClient = new Redis(
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
      { lazyConnect: true, enableOfflineQueue: false, connectTimeout: 2000 },
    );
    try {
      await redisClient.connect();
      await redisClient.ping();
    } catch {
      queueStatus = 'down';
    } finally {
      redisClient.disconnect();
    }

    const overallStatus = databaseStatus === 'up' && queueStatus === 'up' ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      details: {
        database: databaseStatus,
        eventBus: eventBusStatus,
        queue: queueStatus,
      },
    };
  }
}
