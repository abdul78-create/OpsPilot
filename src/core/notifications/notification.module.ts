import { Global, Module } from '@nestjs/common';
import { ConsoleNotificationService } from './console-notification.service';
import { ResendNotificationService } from './resend-notification.service';

const notificationServiceProvider = {
  provide: 'INotificationService',
  useFactory: () => {
    if (process.env.RESEND_API_KEY) {
      return new ResendNotificationService();
    }
    return new ConsoleNotificationService();
  },
};

@Global()
@Module({
  providers: [notificationServiceProvider, ConsoleNotificationService, ResendNotificationService],
  exports: ['INotificationService', ConsoleNotificationService, ResendNotificationService],
})
export class NotificationModule {}
