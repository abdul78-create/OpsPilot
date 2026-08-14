'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Key, Lock, CheckCircle2, FileText, ArrowRight, RefreshCw, Server } from 'lucide-react';

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
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-between">
      {/* Navbar */}
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
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <Link href="/security" className="text-white font-bold">Security</Link>
        </div>

        <Link
          href="/register"
          className="text-xs bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-lg"
        >
          Get Started
        </Link>
      </header>

      {/* Main Body */}
      <main className="max-w-5xl mx-auto w-full py-16 px-6 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Enterprise Security Posture
          </span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Security & Cryptographic Data Protection
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            OpsPilot enforces defense-in-depth security across every layer of the platform — from encrypted secrets storage to tenant isolation boundaries and container runtimes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECURITY_POSTURE.map((sec, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#111113] border border-[#27272A] space-y-3 shadow-xl">
              <div className="p-3 w-fit rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <sec.icon size={20} />
              </div>
              <h3 className="text-base font-bold text-white">{sec.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{sec.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-8 rounded-2xl bg-[#111113] border border-[#27272A] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Need SOC2 or Security Penetration Audit Reports?</h3>
            <p className="text-xs text-zinc-400">Our team provides full compliance documentation and security whitepapers for enterprise deployments.</p>
          </div>
          <Link
            href="/docs"
            className="py-3 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-lg shrink-0"
          >
            Read Security Whitepaper <ArrowRight size={14} className="inline ml-1" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272A] bg-[#111113] py-8 text-center text-xs text-zinc-500">
        OpsPilot SaaS Platform · Enterprise Security & Compliance
      </footer>
    </div>
  );
}
