import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from './event-bus.service';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { IDomainEvent } from './domain-event.interface';

describe('EventBusService — EventEmitter2 Bridge Integration Test', () => {
  let service: EventBusService;
  let emitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [EventBusService],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
    emitter = module.get<EventEmitter2>(EventEmitter2);
  });

  const makeEvent = (name: string, payload: object): IDomainEvent => ({
    eventId: `evt_test_${Date.now()}`,
    eventName: name,
    aggregateId: 'test-agg-id',
    aggregateType: 'TestAggregate',
    occurredOn: new Date(),
    version: 1,
    payload,
  });

  it('should dispatch to custom in-process subscribers', async () => {
    const received: IDomainEvent[] = [];
    service.subscribe('test.event.v1', (e) => {
      received.push(e);
    });
    const event = makeEvent('test.event.v1', { foo: 'bar' });
    await service.publish(event);
    expect(received).toHaveLength(1);
    expect(received[0].payload).toEqual({ foo: 'bar' });
  });

  it('should bridge to EventEmitter2 so @OnEvent handlers fire', async () => {
    const received: IDomainEvent[] = [];
    emitter.on('pipeline.run_failed.v1', (e: IDomainEvent) => {
      received.push(e);
    });
    const event = makeEvent('pipeline.run_failed.v1', { pipelineRunId: 'run_test_123' });
    await service.publish(event);
    expect(received).toHaveLength(1);
    expect((received[0].payload as { pipelineRunId: string }).pipelineRunId).toBe('run_test_123');
  });

  it('should dispatch to BOTH custom subscriber AND EventEmitter2 bridge simultaneously', async () => {
    const customReceived: IDomainEvent[] = [];
    const emitterReceived: IDomainEvent[] = [];
    service.subscribe('pipeline.run_failed.v1', (e) => {
      customReceived.push(e);
    });
    emitter.on('pipeline.run_failed.v1', (e: IDomainEvent) => {
      emitterReceived.push(e);
    });
    const event = makeEvent('pipeline.run_failed.v1', { pipelineRunId: 'run_dual_test' });
    await service.publish(event);
    expect(customReceived).toHaveLength(1);
    expect(emitterReceived).toHaveLength(1);
  });
});
