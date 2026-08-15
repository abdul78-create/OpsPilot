'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Key, Lock, CheckCircle2, FileText, ArrowRight, RefreshCw, Server } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

const SECURITY_POSTURE = [
  {
    icon: Key,
    title: 'AES-256-GCM Secret Encryption',
    desc: 'All environment variables and secret keys are encrypted using AES-256-GCM with 96-bit IVs and 128-bit authentication tags. Plaintext secrets are only decrypted in ephemeral Docker runtimes.',
  },
  {
    icon: Lock,
    title: 'HMAC-SHA256 Signature Verification',
    desc: 'Every GitHub push webhook is HMAC-SHA256 signature verified against your repository secret key before processing. Modified signatures or forged payloads are rejected.',
  },
  {
    icon: Server,
    title: 'Multi-Tenant Boundary Controls & IDOR Protection',
    desc: 'Strict organization tenant guards prevent cross-tenant access. Every API request is verified against RBAC permissions (Owner, Admin, Developer, Viewer, Billing).',
  },
  {
    icon: Shield,
    title: 'Isolated Container Runtimes',
    desc: 'Pipeline jobs execute inside short-lived, unprivileged Docker containers with ephemeral disk leases. Workspace environments are purged automatically upon run completion.',
  },
];

export default function SecurityPosturePage() {
  return (
    <div
      className="min-h-screen flex flex-col justify-between"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Navbar */}
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
          <Link href="/pricing" className="hover:opacity-80 transition-opacity">Pricing</Link>
          <Link href="/docs" className="hover:opacity-80 transition-opacity">Docs</Link>
          <Link href="/security" className="font-bold" style={{ color: 'var(--text-primary)' }}>Security</Link>
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

      {/* Main Body */}
      <main className="max-w-5xl mx-auto w-full py-16 px-6 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span
            className="text-[11px] font-bold border px-3 py-1 rounded-full uppercase tracking-wider font-mono"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Security Architecture
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Cryptographic Protection & Trust Boundaries
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            OpsPilot enforces defense-in-depth security across every layer of the platform — from encrypted secrets storage to tenant isolation boundaries and ephemeral container runtimes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECURITY_POSTURE.map((sec, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border space-y-3 shadow-sm transition-all"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              <div
                className="p-2.5 w-fit rounded-xl border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <sec.icon size={20} />
              </div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{sec.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{sec.desc}</p>
            </div>
          ))}
        </div>

        <div
          className="p-8 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="space-y-1">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Need SOC2 or Security Penetration Audit Reports?</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Our team provides full compliance documentation and security whitepapers for enterprise deployments.</p>
          </div>
          <Link
            href="/docs"
            className="py-3 px-5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80 shrink-0 flex items-center gap-1.5"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <span>Read Documentation</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        OpsPilot SaaS Platform · Enterprise Security & Compliance
      </footer>
    </div>
  );
}
