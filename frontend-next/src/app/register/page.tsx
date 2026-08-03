'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
  ];
  const strength = checks.filter(c => c.pass).length;
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? colors[strength] : 'bg-[#27272A]'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className={`text-[10px] flex items-center gap-1 ${c.pass ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {c.pass ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        <span className={`text-[10px] font-semibold ${colors[strength] === 'bg-emerald-500' ? 'text-emerald-400' : 'text-zinc-500'}`}>
          {labels[strength]}
        </span>
      </div>
    </div>
  );
}

import { useToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleGithubMock = () => {
    toast({
      kind: 'info',
      title: 'GitHub Signup (Demo)',
      message: 'GitHub OAuth signup is simulated. Please fill in the registration forms to create a local account.',
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) { setStep(s => s + 1); return; }

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
      if (typeof window !== 'undefined') {
        localStorage.setItem('opspilot_token', data.data?.tokens?.accessToken || data.tokens?.accessToken || '');
        localStorage.setItem('opspilot_user', JSON.stringify(data.data?.user || data.user || {}));
      }
      window.location.href = '/dashboard';
    } catch {
      setError('Network connection error. Ensure the backend engine is running and CORS is allowed.');
    } finally {
      setLoading(false);
    }
  };

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
          {/* Steps */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${step >= s ? 'text-violet-400' : 'text-zinc-600'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step > s ? 'bg-violet-600 text-white' : step === s ? 'bg-violet-600/20 text-violet-400 ring-1 ring-violet-500/40' : 'bg-[#18181B] text-zinc-600'}`}>
                    {step > s ? '✓' : s}
                  </div>
                  <span>{s === 1 ? 'Account' : 'Workspace'}</span>
                </div>
                {s < 2 && <div className={`flex-1 h-px transition-colors ${step > s ? 'bg-violet-600/40' : 'bg-[#27272A]'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">
              {step === 1 ? 'Create your account' : 'Set up your workspace'}
            </h1>
            <p className="text-sm text-zinc-500">
              {step === 1 ? 'Start deploying in minutes' : 'Almost there — name your organization'}
            </p>
          </div>

          {step === 1 && (
            <button
              type="button"
              onClick={handleGithubMock}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#3F3F46] text-zinc-200 text-sm font-semibold transition-all mb-4 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <GithubIcon size={16} />
              Sign up with GitHub (Demo)
            </button>
          )}

          {step === 1 && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#27272A]" />
              <span className="text-xs text-zinc-600">or</span>
              <div className="flex-1 h-px bg-[#27272A]" />
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Full name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
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
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Organization name</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => updateForm('company', e.target.value)}
                    placeholder="Acme Corp"
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
                  />
                </div>
                <p className="text-[11px] text-zinc-600">This becomes your workspace URL: opspilot.io/<span className="text-zinc-400">{form.company.toLowerCase().replace(/\s+/g, '-') || 'your-org'}</span></p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-violet-500/20"
            >
              {loading ? (
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
              ) : (
                <>{step === 1 ? 'Continue' : 'Create workspace'} <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {step === 1 && (
            <p className="text-xs text-center text-zinc-600 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
