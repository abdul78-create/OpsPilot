'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  CreditCard, Zap, CheckCircle2, ArrowRight, ShieldCheck,
  Receipt, Download, Sparkles, AlertCircle, Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  fetchSubscriptionAndUsage,
  fetchInvoices,
  createCheckout,
  SubscriptionUsageData,
  InvoiceItem,
} from '@/lib/apiClient';

interface PlanDefinition {
  key: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

const PLANS: PlanDefinition[] = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'For side projects and solo developers.',
    features: ['100 build minutes/mo', '50 deployments/mo', '1GB artifact storage', 'Up to 3 team seats', 'Community support'],
    cta: 'Current Plan',
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For growing teams shipping fast.',
    features: ['10,000 build minutes/mo', '1,000 deployments/mo', '50GB artifact storage', 'Up to 15 team seats', 'AI RCA & Copilot included', 'Priority email support'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: '$199',
    period: 'per month',
    description: 'For high-scale engineering organizations.',
    features: ['100,000 build minutes/mo', '10,000 deployments/mo', '500GB artifact storage', 'Up to 100 team seats', 'Dedicated AI instance', '24/7 SLA & Audit logs'],
    cta: 'Contact Sales',
  },
];

export default function BillingPage() {
  const [subData, setSubData] = useState<SubscriptionUsageData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const { toast } = useToast();

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, invRes] = await Promise.allSettled([
        fetchSubscriptionAndUsage(),
        fetchInvoices(),
      ]);

      if (subRes.status === 'fulfilled' && subRes.value?.data) {
        setSubData(subRes.value.data);
      } else {
        setSubData(null);
      }

      if (invRes.status === 'fulfilled' && invRes.value?.data) {
        setInvoices(invRes.value.data);
      } else {
        setInvoices([]);
      }
    } catch {
      setSubData(null);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const activePlanKey = (subData?.plan?.name || 'STARTER').toUpperCase();

  const usage = subData?.usage ?? {
    buildMinutes: 0,
    buildMinutesLimit: 100,
    buildMinutesPercent: 0,
    deployments: 0,
    deploymentsLimit: 50,
    deploymentsPercent: 0,
    artifactStorageMB: 0,
    artifactStorageLimitMB: 1024,
    artifactStoragePercent: 0,
    teamSeats: 1,
    teamSeatsLimit: 3,
    teamSeatsPercent: 33,
  };

  const handleUpgrade = async (planKey: string) => {
    if (planKey === activePlanKey) return;
    setUpgrading(planKey);
    try {
      const res = await createCheckout(planKey);
      if (res?.data?.checkoutUrl) {
        toast({
          kind: 'success',
          title: 'Checkout Initialized',
          message: `Redirecting to payment gateway for ${planKey}...`,
        });
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err: any) {
      toast({
        kind: 'error',
        title: 'Upgrade Failed',
        message: err.message || 'Unable to initialize checkout session.',
      });
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-4 overflow-y-auto pr-1">

        {/* Header */}
        <div
          className="h-14 px-4 rounded-xl border flex items-center justify-between shrink-0"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <CreditCard size={16} style={{ color: 'var(--text-muted)' }} />
            <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Billing & Subscriptions</h1>
            <span
              className="text-[10px] font-mono border px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: 'var(--success-dim)',
                borderColor: 'var(--success)',
                color: 'var(--success)',
              }}
            >
              Active: {subData?.plan?.name ?? 'Community Starter'}
            </span>
          </div>
          {activePlanKey === 'STARTER' && (
            <button
              onClick={() => handleUpgrade('PRO')}
              disabled={upgrading === 'PRO'}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80 shadow-sm"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              {upgrading === 'PRO' ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Usage Quota Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="p-4 rounded-xl border space-y-2"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Build Minutes</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                {usage.buildMinutes} / {usage.buildMinutesLimit}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, usage.buildMinutesPercent)}%`, background: 'var(--accent)' }} />
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{usage.buildMinutesPercent}% consumed this cycle</p>
          </div>

          <div
            className="p-4 rounded-xl border space-y-2"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Deployments</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                {usage.deployments} / {usage.deploymentsLimit}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, usage.deploymentsPercent)}%`, background: 'var(--info)' }} />
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{usage.deploymentsPercent}% consumed this cycle</p>
          </div>

          <div
            className="p-4 rounded-xl border space-y-2"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Artifact Storage</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                {(usage.artifactStorageMB / 1024).toFixed(1)}GB / {(usage.artifactStorageLimitMB / 1024).toFixed(0)}GB
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, usage.artifactStoragePercent)}%`, background: 'var(--warning)' }} />
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{usage.artifactStoragePercent}% consumed of storage quota</p>
          </div>

          <div
            className="p-4 rounded-xl border space-y-2"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Team Seats</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                {usage.teamSeats} / {usage.teamSeatsLimit}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, usage.teamSeatsPercent)}%`, background: 'var(--success)' }} />
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{usage.teamSeatsPercent}% seats assigned</p>
          </div>
        </div>

        {/* Subscription Plans Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Subscription Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((p) => {
              const isCurrent = activePlanKey === p.key;
              return (
                <div
                  key={p.key}
                  className="p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-6"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: isCurrent ? 'var(--accent)' : 'var(--border)',
                    boxShadow: isCurrent ? 'var(--shadow-md)' : 'none',
                  }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                      {isCurrent && (
                        <span
                          className="text-[10px] font-semibold border px-2 py-0.5 rounded-full"
                          style={{
                            background: 'var(--bg-tertiary)',
                            borderColor: 'var(--border)',
                            color: 'var(--accent)',
                          }}
                        >
                          Current Plan
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{p.price}</span>
                      <span className="text-xs ml-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>/{p.period}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                    <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      {p.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <CheckCircle2 size={13} className="shrink-0" style={{ color: 'var(--success)' }} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpgrade(p.key)}
                    disabled={isCurrent || upgrading === p.key}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      background: isCurrent
                        ? 'var(--bg-tertiary)'
                        : p.highlight
                        ? 'var(--accent)'
                        : 'var(--bg-tertiary)',
                      color: isCurrent
                        ? 'var(--text-muted)'
                        : p.highlight
                        ? 'var(--accent-fg)'
                        : 'var(--text-primary)',
                      border: isCurrent ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {upgrading === p.key ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <span>{isCurrent ? 'Current Plan' : p.cta}</span>
                        {!isCurrent && <ArrowRight size={13} />}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice History */}
        <div
          className="p-6 rounded-2xl border space-y-4"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={15} style={{ color: 'var(--text-muted)' }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Payment Invoice History
              </h2>
            </div>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} issued
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  <th className="pb-3">Invoice ID</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      No billing invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:opacity-80 transition-opacity">
                      <td className="py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{inv.id}</td>
                      <td className="py-3" style={{ color: 'var(--text-muted)' }}>{inv.date}</td>
                      <td className="py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{inv.plan || 'Subscription'}</td>
                      <td className="py-3 font-bold" style={{ color: 'var(--text-primary)' }}>{inv.amount}</td>
                      <td className="py-3">
                        <span
                          className="text-[10px] font-mono border px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: 'var(--success-dim)',
                            borderColor: 'var(--success)',
                            color: 'var(--success)',
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {inv.pdfUrl ? (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded transition-colors inline-block"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <Download size={14} />
                          </a>
                        ) : (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DeveloperShell>
  );
}
