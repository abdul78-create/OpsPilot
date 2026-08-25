import { Module } from '@nestjs/common';
import { AlertsRepository } from './alerts.repository';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { PrismaModule } from '../../../core/database/prisma.module';
import { SecurityModule } from '../../../core/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [AlertsController],
  providers: [AlertsRepository, AlertsService],
  exports: [AlertsRepository, AlertsService],
})
export class AlertsModule {}
