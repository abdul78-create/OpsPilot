'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2, Sparkles, PlayCircle, KeyRound } from 'lucide-react';
import { enableDemoMode, disableDemoMode } from '@/lib/demoData';

const FEATURES_LIST = [
  'Automated CI/CD pipeline from first push',
  'Isolated Docker build environments',
  'AI-powered root cause analysis',
  'Real-time log streaming via SSE',
  'HMAC-verified webhook security',
  'Auto-rollback on failed health checks',
];

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInstantDemo = () => {
    enableDemoMode();
    window.location.href = '/dashboard';
  };

  const handleFillDemoCreds = () => {
    setEmail('demo@opspilot.io');
    setPassword('demo123');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // If user enters demo credentials, activate Demo Mode
    if (email.toLowerCase().trim() === 'demo@opspilot.io') {
      enableDemoMode();
      window.location.href = '/dashboard';
      return;
    }

    // Standard real login flow
    disableDemoMode();

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Fallback for HTML/text error pages (e.g. Nginx 502/504 gateways)
      }

      if (!res.ok) {
        const msg = data.message || `HTTP ${res.status}: Authentication failed`;
        // Surface unverified email as a special callout
        if (res.status === 401 && msg.toLowerCase().includes('verif')) {
          setError('Please verify your email before signing in. Check your inbox for the verification link.');
        } else {
          setError(msg);
        }
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('opspilot_token', data.data?.tokens?.accessToken || data.tokens?.accessToken || '');
        localStorage.setItem('opspilot_user', JSON.stringify(data.data?.user || data.user || {}));
      }
      window.location.href = '/dashboard';
    } catch {
      setError('Network connection error. Ensure the backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-[#1C1C1F]">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-blue-600/5 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/landing" className="flex items-center gap-2.5 group w-fit">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-base font-bold text-white">OpsPilot</span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Deploy with confidence.<br/>
              <span className="gradient-text">Every single time.</span>
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
              Join 2,100+ engineering teams who ship faster with OpsPilot's autonomous CI/CD platform.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES_LIST.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* Mini pipeline visual */}
          <div className="rounded-xl bg-[#111113] border border-[#27272A] p-4 font-mono text-xs space-y-1">
            <div className="text-zinc-500">$ git push origin main</div>
            <div className="text-violet-400">⚡ Pipeline triggered</div>
            <div className="text-zinc-400">▶ Clone → Install → Build → Test → Deploy</div>
            <div className="text-emerald-400">✓ Deployed in 27.1s · HTTP 200 OK</div>
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10">
          <p className="text-zinc-500 text-xs italic">
            &ldquo;The AI RCA alone saved us 6 hours this month.&rdquo;
          </p>
          <p className="text-zinc-600 text-xs mt-1">— Sarah K., Platform Engineering Lead at TechFlow</p>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-5 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white">OpsPilot</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-zinc-500">Sign in to your workspace</p>
          </div>

          {/* ── One-Click Demo Mode Banner/Button ── */}
          <button
            type="button"
            onClick={handleInstantDemo}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-violet-600/20 via-purple-600/15 to-blue-600/20 border border-violet-500/40 hover:border-violet-400 group transition-all hover:scale-[1.01] shadow-lg shadow-violet-950/20 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-600/30 border border-violet-400/30 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-violet-300 group-hover:rotate-12 transition-transform" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Interactive Demo Mode</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded border border-violet-400/30">Instant</span>
                </div>
                <p className="text-[11px] text-zinc-400">Explore populated dashboard & AI RCA without signing up</p>
              </div>
            </div>
            <PlayCircle size={18} className="text-violet-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-[#27272A]" />
            <span className="text-[11px] text-zinc-600 uppercase tracking-wider">or sign in with credentials</span>
            <div className="flex-1 h-px bg-[#27272A]" />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">Password</label>
                <Link href="/forgot-password" className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#111113] border border-[#27272A] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input id="remember" type="checkbox" className="w-3.5 h-3.5 accent-violet-600 rounded" />
              <label htmlFor="remember" className="text-xs text-zinc-500">Remember me</label>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-violet-500/20"
            >
              {loading ? (
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10"/></svg>
              ) : (
                <>Sign in <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {/* ── Demo Credentials Callout ── */}
          <div className="p-3.5 rounded-xl bg-[#111113] border border-[#27272A] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <KeyRound size={13} className="text-amber-400" /> Demo Credentials
              </span>
              <button
                type="button"
                onClick={handleFillDemoCreds}
                className="text-[10px] text-violet-400 hover:text-violet-300 underline font-medium transition-colors"
              >
                Auto-fill fields
              </button>
            </div>
            <div className="flex items-center justify-between text-xs font-mono bg-[#18181B] px-2.5 py-1.5 rounded border border-[#27272A] text-zinc-300">
              <span>demo@opspilot.io</span>
              <span className="text-zinc-500">demo123</span>
            </div>
          </div>

          <p className="text-xs text-center text-zinc-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
