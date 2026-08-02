export interface IDomainEvent<T = unknown> {
  eventId: string;
  eventName: string;
  aggregateId: string;
  aggregateType: string;
  occurredOn: Date;
  version: number;
  payload: T;
  correlationId?: string;
  causationId?: string;
}
