import { simulateLiveProgress, DEMO_WEBHOOK_EVENTS } from './demoEvents';
import { getLiveCpuUsage, getLiveMemoryUsage } from './demoMetrics';
import { demoService } from './demoService';

export type DemoEventType =
  | 'PipelineStarted'
  | 'PipelineCompleted'
  | 'DeploymentSucceeded'
  | 'NotificationCreated'
  | 'MetricUpdated'
  | 'LogAppended';

export interface DemoEvent {
  type: DemoEventType;
  payload: any;
  timestamp: string;
}

type DemoEventListener = (event: DemoEvent) => void;

/**
 * Single Unified Demo Runtime & Event Bus
 * Owns all interval loops, state progression, and event subscriptions.
 */
class DemoRuntimeManager {
  private listeners: Set<DemoEventListener> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start(): void {
    if (this.isRunning || !demoService.isEnabled()) return;
    this.isRunning = true;

    // Single master heartbeat interval (every 3 seconds)
    this.intervalId = setInterval(() => {
      this.tick();
    }, 3000);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  public subscribe(listener: DemoEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(type: DemoEventType, payload: any): void {
    const event: DemoEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        // Ignore subscriber errors
      }
    });
  }

  private tick(): void {
    if (!demoService.isEnabled()) {
      this.stop();
      return;
    }

    // 1. Advance pipeline states
    simulateLiveProgress();

    // 2. Broadcast metric updates
    this.emit('MetricUpdated', {
      cpu: getLiveCpuUsage(),
      memoryMb: getLiveMemoryUsage(),
    });
  }
}

export const demoRuntime = new DemoRuntimeManager();

if (typeof window !== 'undefined') {
  demoRuntime.start();
}
