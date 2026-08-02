import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogsRepository } from './logs.repository';
import { LogStreamingService } from '../../../core/log-streaming/log-streaming.service';

@Module({
  controllers: [LogsController],
  providers: [LogsService, LogsRepository, LogStreamingService],
  exports: [LogsService, LogsRepository, LogStreamingService],
})
export class LogStreamingModule {}
