import { NotificationItem } from '@/components/ui/NotificationCenter';

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n_demo_1',
    kind: 'success',
    title: 'Deployment Successful',
    message: 'stockflow-backend:v2.4.0 deployed to Production Singapura cluster.',
    time: '2m ago',
    unread: true,
  },
  {
    id: 'n_demo_2',
    kind: 'failed',
    title: 'Pipeline Run Failed',
    message: 'payments-worker #run_demo_104 failed during Stripe API Mock stage.',
    time: '15m ago',
    unread: true,
  },
  {
    id: 'n_demo_3',
    kind: 'connected',
    title: 'OpsPilot AI Analysis Ready',
    message: 'AI RCA generated root cause analysis for payments-worker run #104 (Confidence 94%).',
    time: '14m ago',
    unread: false,
  },
  {
    id: 'n_demo_4',
    kind: 'secrets',
    title: 'Secret Variable Updated',
    message: 'STRIPE_WEBHOOK_SECRET updated by Sarah Chen.',
    time: '1h ago',
    unread: false,
  },
];
