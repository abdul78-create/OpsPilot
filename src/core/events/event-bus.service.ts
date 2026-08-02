import { Injectable, Logger } from '@nestjs/common';
import { IDomainEvent } from './domain-event.interface';
import { IEventPublisher } from './event-publisher.interface';

export type EventHandler<T = unknown> = (event: IDomainEvent<T>) => Promise<void> | void;

@Injectable()
export class EventBusService implements IEventPublisher {
  private readonly logger = new Logger(EventBusService.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) || [];
    this.handlers.set(eventName, [...existing, handler as EventHandler]);
    this.logger.debug(`Subscribed handler for domain event: ${eventName}`);
  }

  async publish<T>(event: IDomainEvent<T>): Promise<void> {
    this.logger.log(`Publishing domain event [${event.eventName}] (ID: ${event.eventId})`);
    const handlers = this.handlers.get(event.eventName) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        this.logger.error(
          `Error handling domain event [${event.eventName}]: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
