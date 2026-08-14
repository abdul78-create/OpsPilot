'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  CreditCard, Zap, CheckCircle2, ArrowRight, ShieldCheck,
  Receipt, Download, Sparkles, RefreshCw, AlertCircle, Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface UsageMetrics {
  buildMinutes: number;
  buildMinutesLimit: number;
  buildMinutesPercent: number;
  deployments: number;
  deploymentsLimit: number;
  deploymentsPercent: number;
  artifactStorageMB: number;
  artifactStorageLimitMB: number;
  artifactStoragePercent: number;
  teamSeats: number;
  teamSeatsLimit: number;
  teamSeatsPercent: number;
}

interface Plan {
  name: string;
  price: string;
  maxBuildMinutes: number;
  maxDeployments: number;
  maxArtifactStorageMB: number;
  maxTeamSeats: number;
  aiRcaEnabled: boolean;
}

const PLANS = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'For side projects and solo developers.',
    features: ['100 build minutes/mo', '50 deployments/mo', '1GB artifact storage', 'Up to 3 team seats', 'Community support'],
    cta: 'Current Plan',
    current: false,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For growing teams shipping fast.',
    features: ['10,000 build minutes/mo', '1,000 deployments/mo', '50GB artifact storage', 'Up to 15 team seats', 'AI RCA & Copilot included', 'Priority email support'],
    cta: 'Upgrade to Pro',
    current: true,
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
    current: false,
  },
];

const INVOICES = [
  { id: 'inv_01', date: '2026-08-01', amount: '$29.00', status: 'PAID', plan: 'Pro Plan (Monthly)' },
  { id: 'inv_02', date: '2026-07-01', amount: '$29.00', status: 'PAID', plan: 'Pro Plan (Monthly)' },
];

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const { toast } = useToast();

  const usage: UsageMetrics = {
    buildMinutes: 420,
    buildMinutesLimit: 10000,
    buildMinutesPercent: 4,
    deployments: 68,
    deploymentsLimit: 1000,
    deploymentsPercent: 7,
    artifactStorageMB: 2560,
    artifactStorageLimitMB: 51200,
    artifactStoragePercent: 5,
    teamSeats: 4,
    teamSeatsLimit: 15,
    teamSeatsPercent: 27,
  };

  const handleUpgrade = async (planKey: string) => {
    setUpgrading(planKey);
    setTimeout(() => {
      toast({
        kind: 'success',
        title: 'Checkout Session Initialized',
        message: `Redirecting to Stripe payment gateway for ${planKey}...`,
      });
      setUpgrading(null);
    }, 1200);
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-4 overflow-y-auto pr-1">
        {/* Header */}
        <div className="h-14 px-4 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <CreditCard size={16} className="text-violet-400" />
            <h1 className="text-sm font-bold text-zinc-100">Billing & Subscriptions</h1>
            <span className="text-[10px] font-mono text-emerald-400 border border-emerald-800/40 bg-emerald-900/20 px-2 py-0.5 rounded-full">
              Active: Pro Plan
            </span>
          </div>
          <button
            onClick={() => handleUpgrade('PRO')}
            className="flex items-center gap-1.5 text-[11px] bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-lg"
          >
            <Zap size={12} /> Manage Subscription
          </button>
        </div>

        {/* Usage Quota Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#111113] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Build Minutes</span>
              <span className="font-mono text-zinc-200">{usage.buildMinutes} / {usage.buildMinutesLimit}</span>
            </div>
            <div className="w-full h-2 bg-[#18181B] rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${usage.buildMinutesPercent}%` }} />
            </div>
            <p className="text-[10px] text-zinc-500">{usage.buildMinutesPercent}% consumed this billing cycle</p>
          </div>

          <div className="p-4 rounded-xl bg-[#111113] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Deployments</span>
              <span className="font-mono text-zinc-200">{usage.deployments} / {usage.deploymentsLimit}</span>
            </div>
            <div className="w-full h-2 bg-[#18181B] rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${usage.deploymentsPercent}%` }} />
            </div>
            <p className="text-[10px] text-zinc-500">{usage.deploymentsPercent}% consumed this billing cycle</p>
          </div>

          <div className="p-4 rounded-xl bg-[#111113] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Artifact Storage</span>
              <span className="font-mono text-zinc-200">{(usage.artifactStorageMB / 1024).toFixed(1)}GB / 50GB</span>
            </div>
            <div className="w-full h-2 bg-[#18181B] rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${usage.artifactStoragePercent}%` }} />
            </div>
            <p className="text-[10px] text-zinc-500">{usage.artifactStoragePercent}% consumed of storage quota</p>
          </div>

          <div className="p-4 rounded-xl bg-[#111113] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Team Seats</span>
              <span className="font-mono text-zinc-200">{usage.teamSeats} / {usage.teamSeatsLimit}</span>
            </div>
            <div className="w-full h-2 bg-[#18181B] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${usage.teamSeatsPercent}%` }} />
            </div>
            <p className="text-[10px] text-zinc-500">{usage.teamSeatsPercent}% seats assigned</p>
          </div>
        </div>

        {/* Subscription Plans Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Subscription Tier Plans</h2>
          <div className="grid grid-cols-3 gap-4">
            {PLANS.map((p) => (
              <div
                key={p.key}
                className={`p-6 rounded-2xl bg-[#111113] border transition-all flex flex-col justify-between space-y-6 ${
                  p.highlight ? 'border-violet-500/50 shadow-xl shadow-violet-500/10' : 'border-[#27272A]'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    {p.current && (
                      <span className="text-[10px] font-semibold text-violet-300 bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded-full">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-white">{p.price}</span>
                    <span className="text-xs text-zinc-500 ml-1.5">/{p.period}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{p.description}</p>
                  <div className="space-y-2 pt-2 border-t border-[#27272A]">
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleUpgrade(p.key)}
                  disabled={p.current || upgrading === p.key}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    p.current
                      ? 'bg-[#18181B] text-zinc-500 cursor-not-allowed'
                      : p.highlight
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg'
                      : 'bg-[#18181B] hover:bg-[#27272A] text-zinc-200'
                  }`}
                >
                  {upgrading === p.key ? <Loader2 size={14} className="animate-spin" /> : <>{p.cta} <ArrowRight size={14} /></>}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice History */}
        <div className="p-6 rounded-2xl bg-[#111113] border border-[#27272A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-zinc-400" />
              <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Payment Invoice History</h2>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">2 invoices issued</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#27272A] text-zinc-500">
                  <th className="pb-3 font-semibold">Invoice ID</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Plan</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#18181B]/50 transition-colors">
                    <td className="py-3 font-mono text-zinc-300">{inv.id}</td>
                    <td className="py-3 text-zinc-400">{inv.date}</td>
                    <td className="py-3 text-zinc-300 font-medium">{inv.plan}</td>
                    <td className="py-3 text-white font-bold">{inv.amount}</td>
                    <td className="py-3">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/20 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => toast({ kind: 'info', title: 'Downloading Invoice PDF', message: `${inv.id}.pdf` })}
                        className="text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DeveloperShell>
  );
}
