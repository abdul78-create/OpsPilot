'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

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
    cta: 'Upgrade to Pro',
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
    <div
      className="min-h-screen flex flex-col justify-between"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header Navigation */}
      <header
        className="h-16 border-b sticky top-0 z-50 flex items-center justify-between px-8 backdrop-blur-md"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <Link href="/" className="flex items-center gap-3 text-decoration-none">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            OP
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
            OpsPilot
          </span>
        </Link>

        <div className="flex items-center gap-6 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="hover:opacity-80 transition-opacity">Home</Link>
          <Link href="/features" className="hover:opacity-80 transition-opacity">Features</Link>
          <Link href="/pricing" className="font-bold" style={{ color: 'var(--text-primary)' }}>Pricing</Link>
          <Link href="/docs" className="hover:opacity-80 transition-opacity">Docs</Link>
          <Link href="/security" className="hover:opacity-80 transition-opacity">Security</Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-xs font-bold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto w-full py-16 px-6 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span
            className="text-[11px] font-bold border px-3 py-1 rounded-full uppercase tracking-wider font-mono"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Predictable SaaS Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Simple, Transparent Plans for Teams of All Sizes
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Ship code faster with zero hidden fees. Scale build minutes and team seats seamlessly.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <div
              className="p-1 rounded-xl border flex items-center gap-1"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => setBillingCycle('monthly')}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: billingCycle === 'monthly' ? 'var(--accent)' : 'transparent',
                  color: billingCycle === 'monthly' ? 'var(--accent-fg)' : 'var(--text-muted)',
                }}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: billingCycle === 'yearly' ? 'var(--accent)' : 'transparent',
                  color: billingCycle === 'yearly' ? 'var(--accent-fg)' : 'var(--text-muted)',
                }}
              >
                <span>Annual Billing</span>
                <span
                  className="text-[10px] font-mono border px-1.5 py-0.5 rounded-md font-semibold"
                  style={{
                    background: 'var(--success-dim)',
                    borderColor: 'var(--success)',
                    color: 'var(--success)',
                  }}
                >
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl border flex flex-col justify-between space-y-6 transition-all"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: tier.highlight ? 'var(--accent)' : 'var(--border)',
                boxShadow: tier.highlight ? 'var(--shadow-md)' : 'none',
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{tier.name}</h3>
                  {tier.highlight && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                      style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      Most Popular
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {billingCycle === 'yearly' && tier.price !== '$0' ? `$${Math.round(parseInt(tier.price.replace('$', '')) * 0.8)}` : tier.price}
                  </span>
                  <span className="text-xs ml-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>/{tier.period}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tier.description}</p>
                <div className="space-y-2.5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  {tier.features.map((feat, fi) => (
                    <div key={fi} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={14} className="shrink-0" style={{ color: 'var(--success)' }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/billing"
                className="w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                style={{
                  background: tier.highlight ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: tier.highlight ? 'var(--accent-fg)' : 'var(--text-primary)',
                  border: tier.highlight ? 'none' : '1px solid var(--border)',
                }}
              >
                <span>{tier.cta}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        OpsPilot SaaS Platform · Enterprise CI/CD & Deployment Engine
      </footer>
    </div>
  );
}
