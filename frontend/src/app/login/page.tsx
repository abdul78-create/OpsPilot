'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Shield,
  Sparkles,
  Layers,
  GitBranch,
  Server,
  Activity,
  Box,
} from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { getApiBaseUrl, getOAuthBaseUrl } from '@/lib/apiClient';

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const CONTROL_PILLARS = [
  { icon: Layers, label: 'Visual DAG Pipelines', desc: 'Drag-and-drop multi-stage orchestration' },
  { icon: Server, label: 'Ephemeral Docker Runners', desc: 'Hermetic container isolation per run' },
  {
    icon: Terminal,
    label: 'Sub-Second SSE Logs',
    desc: 'Real-time stdout streaming without refresh',
  },
  {
    icon: Sparkles,
    label: 'AI Root Cause Analysis',
    desc: 'Actionable compiler fix diffs & commands',
  },
];

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthProviders, setOauthProviders] = useState<{ google: boolean; github: boolean }>({
    google: true,
    github: true,
  });
  const [oauthHelp, setOauthHelp] = useState<'google' | 'github' | null>(null);
  const [showEnvGuide, setShowEnvGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      setError(`OAuth Error: ${oauthError}`);
    } else if (token) {
      localStorage.setItem('opspilot_token', token);
      if (userParam) {
        try {
          localStorage.setItem('opspilot_user', userParam);
        } catch {
          /* ignore */
        }
      }
      window.location.href = '/dashboard';
    }

    const checkProviders = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/auth/providers`);
        if (res.ok) {
          const json = await res.json();
          const providers = json?.data ?? json;
          setOauthProviders({
            google: Boolean(providers?.google),
            github: Boolean(providers?.github),
          });
        }
      } catch {
        // network or offline fallback
      }
    };
    checkProviders();
  }, []);

  const handleGoogleLogin = () => {
    if (!oauthProviders.google) {
      setOauthHelp('google');
      setError('');
      return;
    }
    const oauthBase = getOAuthBaseUrl();
    window.location.href = `${oauthBase}/auth/google`;
  };

  const handleGitHubLogin = () => {
    if (!oauthProviders.github) {
      setOauthHelp('github');
      setError('');
      return;
    }
    const oauthBase = getOAuthBaseUrl();
    window.location.href = `${oauthBase}/auth/github`;
  };

  const handleQuickLoginQA = async () => {
    setEmail('qa@opspilot.dev');
    setPassword('QASecretPassword@2026!');
    setError('');
    setOauthHelp(null);
    setLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'qa@opspilot.dev', password: 'QASecretPassword@2026!' }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        setError((data.message as string) || 'Demo QA login failed');
        return;
      }

      const tokens = (data.data as Record<string, unknown>)?.tokens as
        Record<string, string> | undefined;
      const user = (data.data as Record<string, unknown>)?.user;
      localStorage.setItem('opspilot_token', tokens?.accessToken || '');
      localStorage.setItem('opspilot_user', JSON.stringify(user || {}));
      window.location.href = '/dashboard';
    } catch {
      setError('Network connection error. Ensure the NestJS backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        const msg = (data.message as string) || `HTTP ${res.status}: Authentication failed`;
        if (res.status === 401 && msg.toLowerCase().includes('verif')) {
          setError(
            'Please verify your email before signing in. Check your inbox for the verification link.',
          );
        } else {
          setError(msg);
        }
        return;
      }

      const tokens = (data.data as Record<string, unknown>)?.tokens as
        Record<string, string> | undefined;
      const user = (data.data as Record<string, unknown>)?.user;
      localStorage.setItem('opspilot_token', tokens?.accessToken || '');
      localStorage.setItem('opspilot_user', JSON.stringify(user || {}));
      window.location.href = '/dashboard';
    } catch {
      setError('Network connection error. Ensure the NestJS backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* ── LEFT PANEL: Control Plane Showcase (Desktop) ─────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between border-r relative overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Subtle Ambient Glow */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'var(--accent-glow)' }}
        />

        {/* Top Branding */}
        <div className="z-10">
          <Link href="/" className="flex items-center gap-3 text-decoration-none group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-md transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--info))',
                color: '#FFFFFF',
              }}
            >
              OP
            </div>
            <div className="flex flex-col">
              <span
                className="font-extrabold text-base tracking-tight leading-none"
                style={{ color: 'var(--text-primary)' }}
              >
                OpsPilot AI
              </span>
              <span
                className="text-[10px] font-mono tracking-wider font-semibold"
                style={{ color: 'var(--text-muted)' }}
              >
                CONTROL PLANE
              </span>
            </div>
          </Link>
        </div>

        {/* Center Presentation */}
        <div className="space-y-8 z-10 my-auto">
          <div className="space-y-3">
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border inline-block"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--accent)',
              }}
            >
              ENGINEERING WORKSPACE
            </span>
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Your Unified Delivery Engine.
            </h1>
            <p
              className="text-sm max-w-md leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Orchestrate multi-stage pipelines, stream execution logs in real-time, and deploy
              artifacts safely with continuous observability.
            </p>
          </div>

          {/* Platform Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            {CONTROL_PILLARS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border flex items-start gap-3 transition-colors hover:border-[var(--border-bright)]"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="p-2 rounded-lg shrink-0 mt-0.5"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    <Icon size={14} />
                  </div>
                  <div>
                    <div className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                      {p.label}
                    </div>
                    <div
                      className="text-[11px] leading-snug mt-0.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {p.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Terminal Console Mock */}
          <div
            className="rounded-xl border overflow-hidden font-mono text-xs shadow-md max-w-lg"
            style={{
              background: 'var(--terminal-bg)',
              borderColor: 'var(--border)',
              color: 'var(--terminal-text)',
            }}
          >
            <div
              className="px-4 py-2 border-b flex items-center justify-between text-[11px]"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span className="ml-1 opacity-60">opspilot status</span>
              </div>
              <span className="text-[10px] text-[var(--success)] font-bold">READY</span>
            </div>
            <div className="p-4 space-y-1 text-[11px] leading-relaxed">
              <div className="text-[var(--text-muted)]">$ opspilot connect --status</div>
              <div className="text-[var(--success)]">
                ✓ Control Plane Connected (NestJS API : 3000)
              </div>
              <div className="text-[var(--text-secondary)]">
                ✓ Docker Runner Pool active (cgroup isolation enabled)
              </div>
              <div className="text-[var(--accent)]">
                ✓ Authentication Engine ready (Argon2id + JWT)
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status */}
        <div
          className="flex items-center justify-between text-xs z-10 pt-4 border-t"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span>OpsPilot Platform v2.0</span>
          <span>AES-256 GCM Security</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: Sign-In Form ────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative">
        {/* Top Navigation / Theme Toggle */}
        <div className="flex items-center justify-between w-full">
          <div className="lg:hidden">
            <Link href="/" className="flex items-center gap-2 text-decoration-none">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                style={{ background: 'var(--accent)', color: '#FFFFFF' }}
              >
                OP
              </div>
              <span
                className="font-bold text-sm tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                OpsPilot
              </span>
            </Link>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6 py-8">
          <div className="space-y-2">
            <h2
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Sign in to Control Plane
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
              Enter your credentials to access your pipelines, workspaces, and telemetry.
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGitHubLogin}
              title={!oauthProviders.github ? 'GitHub OAuth unconfigured' : 'Continue with GitHub'}
              className="py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:bg-[var(--bg-secondary)]"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <GithubIcon size={15} />
              <span>GitHub</span>
              {!oauthProviders.github && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono font-normal"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                >
                  off
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              title={!oauthProviders.google ? 'Google OAuth unconfigured' : 'Continue with Google'}
              className="py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:bg-[var(--bg-secondary)]"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <GoogleIcon size={15} />
              <span>Google</span>
              {!oauthProviders.google && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono font-normal"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                >
                  off
                </span>
              )}
            </button>
          </div>

          {/* OAuth Setup Helper (Shown when unconfigured button is clicked) */}
          {oauthHelp && (
            <div
              className="p-4 rounded-xl border text-xs space-y-3 transition-all animate-fadeIn"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-bright, var(--border))',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {oauthHelp === 'github' ? <GithubIcon size={16} /> : <GoogleIcon size={16} />}
                  <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                    {oauthHelp === 'github' ? 'GitHub' : 'Google'} OAuth Not Configured
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOauthHelp(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1 font-bold"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Third-party {oauthHelp === 'github' ? 'GitHub' : 'Google'} OAuth credentials are not set in your local <code className="px-1.5 py-0.5 rounded font-mono text-[10px]" style={{ background: 'var(--bg-tertiary)' }}>.env</code>. You can log in instantly with the verified demo account or view setup instructions.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleQuickLoginQA}
                  disabled={loading}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  style={{
                    background: 'var(--accent)',
                    color: '#FFFFFF',
                  }}
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>Sign in with Demo QA Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEnvGuide((prev) => !prev)}
                  className="py-2 px-3 rounded-lg text-xs font-semibold border transition-all hover:bg-[var(--bg-tertiary)]"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {showEnvGuide ? 'Hide .env Setup' : 'How to Configure'}
                </button>
              </div>

              {showEnvGuide && (
                <div
                  className="p-3 rounded-lg font-mono text-[10px] space-y-1 mt-2 overflow-x-auto border"
                  style={{
                    background: 'var(--terminal-bg, #0d1117)',
                    borderColor: 'var(--border)',
                    color: 'var(--terminal-text, #c9d1d9)',
                  }}
                >
                  <div className="text-[var(--text-muted)] font-sans font-semibold text-[10px] mb-1">
                    Add the following to your root <span className="font-mono">.env</span> file:
                  </div>
                  {oauthHelp === 'github' ? (
                    <>
                      <div>GITHUB_CLIENT_ID=your_github_client_id</div>
                      <div>GITHUB_CLIENT_SECRET=your_github_client_secret</div>
                      <div className="text-[var(--accent)] mt-1.5"># Authorization callback URL in GitHub Settings:</div>
                      <div>http://localhost:3000/v1/auth/github/callback</div>
                    </>
                  ) : (
                    <>
                      <div>GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com</div>
                      <div>GOOGLE_CLIENT_SECRET=your_google_client_secret</div>
                      <div className="text-[var(--accent)] mt-1.5"># Authorized redirect URI in Google Cloud Console:</div>
                      <div>http://localhost:3000/v1/auth/google/callback</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Demo QA Access Pill */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: 'var(--success, #10B981)' }}
              />
              <div className="min-w-0">
                <div className="font-semibold text-xs flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <span>Demo QA Account</span>
                  <span
                    className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    Verified
                  </span>
                </div>
                <div className="text-[11px] truncate font-mono" style={{ color: 'var(--text-muted)' }}>
                  qa@opspilot.dev
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickLoginQA}
              disabled={loading}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all hover:bg-[var(--accent)] hover:text-white"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--accent)',
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
              <span>1-Click Sign In</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
            <span
              className="absolute px-3 text-[11px] uppercase tracking-wider font-mono font-semibold"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}
            >
              Or with email
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="flex items-start justify-between gap-2.5 p-3.5 rounded-xl text-xs border animate-shake"
              style={{
                background: 'var(--error-dim)',
                borderColor: 'var(--error)',
                color: 'var(--error)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="shrink-0 text-xs hover:opacity-80 px-1 font-bold"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Work Email Address
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:border-[var(--accent)]"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold transition-colors hover:text-[var(--accent)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:border-[var(--accent)]"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember-session"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
              />
              <label
                htmlFor="remember-session"
                className="text-xs cursor-pointer select-none"
                style={{ color: 'var(--text-secondary)' }}
              >
                Keep me signed in on this device
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  <span>Sign in to Control Plane</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Footer Signup Link */}
          <div
            className="text-center text-xs pt-4 border-t"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Don&apos;t have an account yet?{' '}
            <Link
              href="/register"
              className="font-bold underline underline-offset-4 hover:text-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Bottom Legal / Support */}
        <div className="text-center text-[11px] pt-4" style={{ color: 'var(--text-muted)' }}>
          By signing in, you agree to OpsPilot&apos;s{' '}
          <Link href="/docs" className="underline hover:text-[var(--text-secondary)]">
            Security Policy
          </Link>{' '}
          and{' '}
          <Link href="/docs" className="underline hover:text-[var(--text-secondary)]">
            Terms of Service
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
