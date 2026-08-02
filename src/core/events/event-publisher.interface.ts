import { IDomainEvent } from './domain-event.interface';

export interface IEventPublisher {
  publish<T>(event: IDomainEvent<T>): Promise<void>;
}
