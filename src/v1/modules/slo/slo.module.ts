import { Module } from '@nestjs/common';
import { SloRepository } from './slo.repository';
import { SloService } from './slo.service';
import { SloController } from './slo.controller';
import { PrismaModule } from '../../../core/database/prisma.module';
import { SecurityModule } from '../../../core/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [SloController],
  providers: [SloRepository, SloService],
  exports: [SloRepository, SloService],
})
export class SloModule {}
