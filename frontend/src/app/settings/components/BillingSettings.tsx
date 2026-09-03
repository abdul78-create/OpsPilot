'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle2, AlertCircle,
  Clock, Download, ExternalLink, Zap
} from 'lucide-react';
import {
  SubscriptionUsageData, InvoiceItem,
  fetchSubscriptionAndUsage, fetchInvoices, createCheckout
} from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

interface BillingSettingsProps {
  organizationId: string;
}

export const BillingSettings: React.FC<BillingSettingsProps> = ({ organizationId }) => {
  const [data, setData] = useState<SubscriptionUsageData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (organizationId) {
      setLoading(true);
      Promise.all([
        fetchSubscriptionAndUsage(organizationId).catch(() => null),
        fetchInvoices(organizationId).catch(() => ({ data: [] })),
      ])
        .then(([subRes, invRes]) => {
          if (subRes?.data) setData(subRes.data);
          if (invRes?.data) setInvoices(invRes.data);
        })
        .finally(() => setLoading(false));
    }
  }, [organizationId]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await createCheckout('ENTERPRISE', organizationId);
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err: any) {
      toast({
        kind: 'warning',
        title: 'Billing Checkout Unavailable',
        message: 'Payment processing is not currently configured in this environment.',
      });
    } finally {
      setUpgrading(false);
    }
  };

  const plan = data?.plan || {
    name: 'Pro Plan',
    price: '$49/mo',
    maxBuildMinutes: 2000,
    maxDeployments: 50,
    maxTeamSeats: 10,
  };

  const usage = data?.usage || {
    buildMinutes: 6,
    buildMinutesLimit: 2000,
    buildMinutesPercent: 1,
    deployments: 3,
    deploymentsLimit: 50,
    deploymentsPercent: 6,
    teamSeats: 1,
    teamSeatsLimit: 10,
    teamSeatsPercent: 10,
  };

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Billing & Subscription Quotas</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Review your organization tier, compute consumption quotas, and payment receipts.
        </p>
      </div>

      {/* ── 1. Plan Overview Card ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">{plan.name}</h3>
                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Standard recurring subscription billed on monthly cycles.
              </p>
            </div>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="px-4 py-1.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm self-start sm:self-center"
          >
            {upgrading ? 'Connecting...' : 'Upgrade Tier'}
          </button>
        </div>

        {/* Usage Quotas */}
        <div className="space-y-4">
          <div className="font-semibold text-[var(--text-primary)]">Compute Consumption Quotas</div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Build Minutes */}
            <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]/60 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Build Duration</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {usage.buildMinutes} / {usage.buildMinutesLimit} min
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(usage.buildMinutesPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Deployments */}
            <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]/60 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Deployments</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {usage.deployments} / {usage.deploymentsLimit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(usage.deploymentsPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Team Seats */}
            <div className="p-3.5 rounded-lg bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]/60 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Team Seats</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {usage.teamSeats} / {usage.teamSeatsLimit} seats
                </span>
              </div>
              <div className="w-full h-1.5 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${Math.min(usage.teamSeatsPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Invoices History ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Invoice History</h3>

        {loading ? (
          <div className="py-4 text-center text-[var(--text-muted)]">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-4 text-center text-[var(--text-muted)]">
            No past invoices. Invoices will populate automatically on subscription billing cycles.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/60">
            {invoices.map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{inv.amount}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">{inv.date} · {inv.status}</div>
                </div>

                {inv.pdfUrl && (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
