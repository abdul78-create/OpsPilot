'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

const FEATURES_LIST = [
  'Automated CI/CD pipeline from first push',
  'Isolated Docker build environments',
  'AI-powered root cause analysis',
  'Real-time log streaming via SSE',
  'HMAC-verified webhook security',
  'Auto-rollback on failed health checks',
];

import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGithubMock = () => {
    toast({
      kind: 'info',
      title: 'GitHub SSO (Demo)',
      message: 'GitHub OAuth requires setting up client credentials. Please use the demo credentials below to log in.',
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Invalid credentials. Try admin@opspilot.io / admin123');
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.data?.tokens?.accessToken || '');
        localStorage.setItem('user', JSON.stringify(data.data?.user || {}));
      }
      window.location.href = '/';
    } catch {
      setError('Network error. Ensure the backend is running.');
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
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
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

          {/* GitHub SSO Button */}
          <button
            type="button"
            onClick={handleGithubMock}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#3F3F46] text-zinc-200 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <GithubIcon size={16} />
            Continue with GitHub (Demo)
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#27272A]" />
            <span className="text-xs text-zinc-600">or continue with email</span>
            <div className="flex-1 h-px bg-[#27272A]" />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
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
                <a href="#" className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
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

          <p className="text-xs text-center text-zinc-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>

          {/* Demo hint */}
          <div className="p-3 rounded-lg bg-[#111113] border border-[#27272A] text-[11px] text-zinc-500 text-center">
            Demo: <code className="text-zinc-300">admin@opspilot.io</code> / <code className="text-zinc-300">admin123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
