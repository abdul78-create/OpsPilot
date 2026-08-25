import { Module } from '@nestjs/common';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { PrismaModule } from '../../../core/database/prisma.module';
import { SecurityModule } from '../../../core/security/security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysRepository, ApiKeysService],
  exports: [ApiKeysRepository, ApiKeysService],
})
export class ApiKeysModule {}
