'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2, MailCheck } from 'lucide-react';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? colors[strength] : 'bg-[#27272A]'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map(c => (
          <span key={c.label} className={`text-[10px] flex items-center gap-1 ${c.pass ? 'text-emerald-400' : 'text-zinc-600'}`}>
            {c.pass ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const updateForm = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, name: form.name }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Fallback for HTML/text error pages (e.g. Nginx 502/504 gateways)
      }

      if (!res.ok) {
        setError(data.message || `HTTP ${res.status}: Registration failed. Try a different email.`);
        return;
      }

      // Registration succeeded — show verification email callout
      setRegisteredEmail(form.email);
      setRegistered(true);
    } catch {
      setError('Network connection error. Ensure the backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  // ── Post-registration: Check Your Inbox ──────────────────────────────────────
  if (registered) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center animate-fade-in space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center">
              <MailCheck size={32} className="text-violet-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Check your inbox</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We sent a verification link to{' '}
              <span className="text-zinc-200 font-medium">{registeredEmail}</span>.
              Click the link in the email to activate your account.
            </p>
          </div>
          <div className="rounded-xl bg-[#111113] border border-[#27272A] p-4 text-left space-y-2">
            {[
              "Check your spam folder if you don't see it",
              'The link expires in 24 hours',
              'You can register again with a different email if needed',
            ].map(tip => (
              <div key={tip} className="flex items-start gap-2.5 text-xs text-zinc-500">
                <CheckCircle2 size={13} className="text-zinc-600 shrink-0 mt-0.5" />
                {tip}
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600">
            Already verified?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Registration Form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09090B] flex">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-[#1C1C1F]">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-blue-600/5 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-96 h-96 bg-blue-600/6 rounded-full blur-3xl pointer-events-none" />

        <Link href="/landing" className="flex items-center gap-2.5 relative z-10 w-fit">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-base font-bold text-white">OpsPilot</span>
        </Link>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Your team deserves<br />
            <span className="gradient-text">better DevOps.</span>
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            Set up in 5 minutes. No credit card required. Cancel anytime.
          </p>
          <div className="space-y-3">
            {[
              'Free forever for solo developers',
              'Unlimited repos on paid plans',
              'RBAC team management included',
              'SOC2-ready security architecture',
              'Deploy to any cloud or on-prem',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                <CheckCircle2 size={14} className="text-violet-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-zinc-600 text-xs">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* ── Right Panel: Form ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-sm text-zinc-500">Start deploying in minutes</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Full name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="register-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Alex Developer"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="register-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-violet-500/20"
            >
              {loading ? (
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
              ) : (
                <>Create account <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-xs text-center text-zinc-600 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
