import { Module } from '@nestjs/common';
import { AlertsRepository } from './alerts.repository';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { CoreModule } from '../../../core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [AlertsController],
  providers: [AlertsRepository, AlertsService],
  exports: [AlertsRepository, AlertsService],
})
export class AlertsModule {}
