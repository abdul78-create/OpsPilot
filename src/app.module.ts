import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import {
  appConfig,
  databaseConfig,
  swaggerConfig,
  loggerConfig,
  envValidationSchema,
} from './config';
import { PrismaModule } from './core/database/prisma.module';
import { AppLoggerModule } from './core/logger/logger.module';
import { RequestContextModule } from './core/context/request-context.module';
import { EventBusModule } from './core/events/event-bus.module';
import { SecurityModule } from './core/security/security.module';
import { NotificationModule } from './core/notifications/notification.module';
import { V1Module } from './v1/v1.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, swaggerConfig, loggerConfig],
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 2000,
      },
    ]),
    AppLoggerModule,
    RequestContextModule,
    EventBusModule,
    SecurityModule,
    NotificationModule,
    PrismaModule,
    V1Module,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
