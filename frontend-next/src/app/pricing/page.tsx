'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const PRICING_TIERS = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'For side projects and solo developers building fast.',
    features: [
      '5 active pipelines',
      '100 build minutes/month',
      '50 deployments/month',
      '1GB binary artifact storage',
      'Public GitHub repositories',
      'Community support',
    ],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For growing engineering teams shipping production releases.',
    features: [
      'Unlimited pipelines',
      '10,000 build minutes/month',
      '1,000 deployments/month',
      '50GB binary artifact storage',
      'Private & Public GitHub repositories',
      'AI Root Cause Analysis & Copilot',
      'AES-256-GCM Secrets Vault',
      'Up to 15 team seats with RBAC',
      'Priority email support',
    ],
    cta: 'Start 14-Day Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: 'per month',
    description: 'For high-scale organizations requiring custom SLAs and governance.',
    features: [
      'Unlimited pipelines & runners',
      '100,000 build minutes/month',
      '10,000 deployments/month',
      '500GB binary artifact storage',
      'Up to 100 team seats',
      'Dedicated AI instance & Custom ML models',
      'Single Sign-On (SSO / SAML)',
      'Audit logs & SOC2 compliance reports',
      '24/7 SLA & dedicated solutions engineer',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

export default function PublicPricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="h-16 border-b border-[#27272A] bg-[#111113]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg">
            OP
          </div>
          <span className="font-bold text-sm text-white tracking-tight">OpsPilot</span>
        </Link>

        <div className="flex items-center gap-6 text-xs font-semibold text-zinc-400">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/pricing" className="text-white font-bold">Pricing</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <Link href="/security" className="hover:text-white transition-colors">Security</Link>
        </div>

        <Link
          href="/register"
          className="text-xs bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-lg"
        >
          Get Started
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto w-full py-16 px-6 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Predictable SaaS Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Simple, Transparent Plans for Teams of All Sizes
          </h1>
          <p className="text-sm text-zinc-400">
            Ship code faster with zero hidden fees. Scale build minutes and team seats seamlessly.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <div className="p-1 rounded-xl bg-[#111113] border border-[#27272A] flex items-center gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  billingCycle === 'monthly' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'yearly' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Annual Billing <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">Save 20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier, i) => (
            <div
              key={i}
              className={`p-8 rounded-2xl bg-[#111113] border flex flex-col justify-between space-y-6 ${
                tier.highlight ? 'border-violet-500/50 shadow-2xl shadow-violet-500/10 relative' : 'border-[#27272A]'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                <div>
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === 'yearly' && tier.price !== '$0' ? `$${Math.round(parseInt(tier.price.replace('$', '')) * 0.8)}` : tier.price}
                  </span>
                  <span className="text-xs text-zinc-500 ml-1.5">/{tier.period}</span>
                </div>
                <p className="text-xs text-zinc-400">{tier.description}</p>
                <div className="space-y-2.5 pt-4 border-t border-[#27272A]">
                  {tier.features.map((feat, fi) => (
                    <div key={fi} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/billing"
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  tier.highlight
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg'
                    : 'bg-[#18181B] hover:bg-[#27272A] text-zinc-200'
                }`}
              >
                {tier.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272A] bg-[#111113] py-8 text-center text-xs text-zinc-500">
        OpsPilot SaaS Platform · Enterprise CI/CD & Deployment Engine
      </footer>
    </div>
  );
}
