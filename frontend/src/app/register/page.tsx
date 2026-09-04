'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
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
  MailCheck,
  Check,
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

function PasswordStrengthMeter({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter((c) => c.pass).length;
  const colors = ['var(--error)', 'var(--warning)', 'var(--info)', 'var(--success)'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1.5 h-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full transition-colors duration-300"
            style={{
              background: i < strength ? colors[strength - 1] : 'var(--border)',
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex gap-2.5 font-mono">
          {checks.map((c) => (
            <span key={c.label} style={{ color: c.pass ? 'var(--success)' : 'var(--text-muted)' }}>
              {c.pass ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        {strength > 0 && (
          <span className="font-bold" style={{ color: colors[strength - 1] }}>
            {labels[strength - 1]}
          </span>
        )}
      </div>
    </div>
  );
}

const ONBOARDING_ROADMAP = [
  { step: '01', title: 'Create Account', desc: 'Secure Argon2id hashing & workspace generation' },
  { step: '02', title: 'Connect GitHub', desc: 'HMAC webhook setup & branch discovery' },
  { step: '03', title: 'Build DAG Pipeline', desc: 'Visual step orchestration & cycle validation' },
  { step: '04', title: 'Execute & Deploy', desc: 'Isolated Docker runner & live SSE streaming' },
];

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [oauthProviders, setOauthProviders] = useState<{ google: boolean; github: boolean }>({
    google: true,
    github: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    if (oauthError) {
      setError(`OAuth Error: ${oauthError}`);
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
        // ignore offline fallback
      }
    };
    checkProviders();
  }, []);

  const handleGoogleLogin = () => {
    if (!oauthProviders.google) {
      setError(
        'Google OAuth is not configured on this instance. Please register with your work email, or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
      );
      return;
    }
    const oauthBase = getOAuthBaseUrl();
    window.location.href = `${oauthBase}/auth/google`;
  };

  const handleGitHubLogin = () => {
    if (!oauthProviders.github) {
      setError(
        'GitHub OAuth is not configured on this instance. Please register with your work email, or set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.',
      );
      return;
    }
    const oauthBase = getOAuthBaseUrl();
    window.location.href = `${oauthBase}/auth/github`;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        setError(
          (data.message as string) || `HTTP ${res.status}: Registration failed. Try another email.`,
        );
        return;
      }

      setRegisteredEmail(email);
      setRegistered(true);
    } catch {
      setError('Network connection error. Ensure the NestJS backend is reachable.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success State ───────────────────────────────────────────
  if (registered) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 relative"
        style={{
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div
          className="w-full max-w-md p-8 rounded-2xl border text-center space-y-6 shadow-xl"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-sm"
            style={{
              background: 'var(--success-dim)',
              borderColor: 'var(--success)',
              color: 'var(--success)',
            }}
          >
            <MailCheck size={32} />
          </div>

          <div className="space-y-2">
            <h1
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Account Created Successfully
            </h1>
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              We have provisioned your account for{' '}
              <span className="font-bold text-[var(--text-primary)]">{registeredEmail}</span>.
            </p>
          </div>

          <div
            className="p-4 rounded-xl border text-left text-xs space-y-2"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
          >
            <div className="font-bold text-[var(--text-primary)]">Next Step: Verification</div>
            <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
              If email verification is enabled on your backend instance, check your inbox. You can
              now proceed to the sign-in page to access your workspace.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <span>Proceed to Sign In</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // ── Standard Register Form ──────────────────────────────────
  return (
    <div
      className="min-h-screen flex"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* ── LEFT PANEL: Onboarding Roadmap (Desktop) ─────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between border-r relative overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Ambient Glow */}
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

        {/* Center Roadmap */}
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
              DEVELOPER ONBOARDING
            </span>
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              From Code to Production in Minutes.
            </h1>
            <p
              className="text-sm max-w-md leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Get started with an autonomous DevOps workspace. Connect your first repository and
              orchestrate your pipeline today.
            </p>
          </div>

          {/* 4-Step Roadmap Cards */}
          <div className="space-y-3 max-w-lg">
            {ONBOARDING_ROADMAP.map((item) => (
              <div
                key={item.step}
                className="p-3.5 rounded-xl border flex items-center gap-3.5 transition-colors hover:border-[var(--border-bright)]"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                    color: 'var(--accent)',
                  }}
                >
                  {item.step}
                </div>
                <div>
                  <div className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Security Note */}
        <div
          className="flex items-center justify-between text-xs z-10 pt-4 border-t"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span>Deterministic Docker Builds</span>
          <span>Zero YAML Complexity</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: Register Form ───────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative overflow-y-auto">
        {/* Top Bar */}
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
        <div className="w-full max-w-md mx-auto my-auto space-y-6 py-6">
          <div className="space-y-2">
            <h2
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Create your account
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
              Start orchestrating visual CI/CD pipelines with real-time logs and telemetry.
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

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
            <span
              className="absolute px-3 text-[11px] uppercase tracking-wider font-mono font-semibold"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}
            >
              Or with work email
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="flex items-start justify-between gap-2.5 p-3.5 rounded-xl text-xs border"
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

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="register-name"
                className="block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Full Name
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  id="register-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alice Chen"
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
              <label
                htmlFor="register-email"
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
                  id="register-email"
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
              <label
                htmlFor="register-password"
                className="block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  id="register-password"
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
              <PasswordStrengthMeter password={password} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-confirm-password"
                className="block text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  id="register-confirm-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:border-[var(--accent)]"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="agree-terms"
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
              />
              <label
                htmlFor="agree-terms"
                className="text-xs cursor-pointer select-none"
                style={{ color: 'var(--text-secondary)' }}
              >
                I agree to the{' '}
                <Link href="/docs" className="underline hover:text-[var(--text-primary)]">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/docs" className="underline hover:text-[var(--text-primary)]">
                  Security Policy
                </Link>
                .
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
                  <span>Create Account & Enter Workspace</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Footer Sign-In Link */}
          <div
            className="text-center text-xs pt-4 border-t"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold underline underline-offset-4 hover:text-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] pt-4" style={{ color: 'var(--text-muted)' }}>
          OpsPilot SaaS Engine · Argon2id Multi-Tenant Encryption
        </div>
      </div>
    </div>
  );
}
