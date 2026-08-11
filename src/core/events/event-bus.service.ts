import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IDomainEvent } from './domain-event.interface';
import { IEventPublisher } from './event-publisher.interface';

export type EventHandler<T = unknown> = (event: IDomainEvent<T>) => Promise<void> | void;

@Injectable()
export class EventBusService implements IEventPublisher {
  private readonly logger = new Logger(EventBusService.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  constructor(@Optional() private readonly emitter?: EventEmitter2) {}

  subscribe<T>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) || [];
    this.handlers.set(eventName, [...existing, handler as EventHandler]);
    this.logger.debug(`Subscribed handler for domain event: ${eventName}`);
  }

  async publish<T>(event: IDomainEvent<T>): Promise<void> {
    this.logger.log(`Publishing domain event [${event.eventName}] (ID: ${event.eventId})`);

    // ── 1. Dispatch to custom in-process subscribers ───────────────────────
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

    // ── 2. Bridge to NestJS EventEmitter2 so @OnEvent decorators fire ──────
    // This connects PipelineRunProcessor events → AiOrchestrationService @OnEvent handlers
    if (this.emitter) {
      try {
        await this.emitter.emitAsync(event.eventName, event);
      } catch (error) {
        this.logger.error(
          `EventEmitter2 bridge error for [${event.eventName}]: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
