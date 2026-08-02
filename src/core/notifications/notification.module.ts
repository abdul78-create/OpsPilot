import { Global, Module } from '@nestjs/common';
import { ConsoleNotificationService } from './console-notification.service';

@Global()
@Module({
  providers: [
    {
      provide: 'INotificationService',
      useClass: ConsoleNotificationService,
    },
    ConsoleNotificationService,
  ],
  exports: ['INotificationService', ConsoleNotificationService],
})
export class NotificationModule {}
