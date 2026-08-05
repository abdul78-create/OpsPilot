export interface AiRcaReport {
  id: string;
  targetId: string;
  type: string;
  summary: string;
  rootCause: string;
  confidenceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  createdAt: string;
}

export function getDemoCopilotRca(targetId: string): AiRcaReport {
  return {
    id: `rpt_demo_${Date.now()}`,
    targetId,
    type: 'ROOT_CAUSE_ANALYSIS',
    summary: 'Stripe Webhook Signature Verification Failure in Integration Stage',
    rootCause:
      'Docker test runner container environment lacks the variable STRIPE_WEBHOOK_SECRET because it was omitted from the .opspilot.yaml integration stage bindings.',
    confidenceScore: 0.94,
    riskLevel: 'HIGH',
    recommendations: [
      'Open OpsPilot Secrets Manager (/secrets) and add variable STRIPE_WEBHOOK_SECRET.',
      'Inject secret into integration stage runner via .opspilot.yaml environment bindings.',
      'Trigger pipeline run again to verify automated verification PASS.',
    ],
    createdAt: new Date().toISOString(),
  };
}
