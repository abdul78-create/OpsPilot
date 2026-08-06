import React from 'react';
import Link from 'next/link';

/* ─── Landing Page ─────────────────────────────────────────── */
export const dynamic = 'force-static';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Zero-Config CI/CD',
    description: 'Push code, OpsPilot scans your repo, builds the pipeline DAG, and ships — no YAML required.',
    gradient: 'from-violet-500/20 to-blue-500/20',
    border: 'border-violet-500/20',
  },
  {
    icon: '🐳',
    title: 'Isolated Docker Builds',
    description: 'Every run gets an ephemeral Docker workspace. No shared state, no dependency conflicts, ever.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/20',
  },
  {
    icon: '📡',
    title: 'Live Log Streaming',
    description: 'Watch your build in real-time with Server-Sent Events. Every stdout line, instantly.',
    gradient: 'from-cyan-500/20 to-emerald-500/20',
    border: 'border-cyan-500/20',
  },
  {
    icon: '🔒',
    title: 'HMAC-Verified Webhooks',
    description: 'Every GitHub push is HMAC-SHA256 verified. Invalid signatures are rejected before processing.',
    gradient: 'from-emerald-500/20 to-violet-500/20',
    border: 'border-emerald-500/20',
  },
  {
    icon: '🔄',
    title: 'Auto Rollback',
    description: 'Health checks fail? OpsPilot detects it and rolls back the deployment automatically.',
    gradient: 'from-amber-500/20 to-red-500/20',
    border: 'border-amber-500/20',
  },
  {
    icon: '🤖',
    title: 'AI Root Cause Analysis',
    description: 'Failed build? Our AI analyzes logs and pinpoints the exact error with fix suggestions.',
    gradient: 'from-violet-500/20 to-pink-500/20',
    border: 'border-violet-500/20',
  },
];

const TESTIMONIALS = [
  {
    quote: 'OpsPilot cut our deployment time from 40 minutes to under 3. The AI RCA alone saved us 6 hours this month.',
    author: 'Sarah K.',
    role: 'Platform Engineering Lead',
    company: 'Enterprise Engineering',

    avatar: 'SK',
    gradient: 'from-violet-600 to-blue-600',
  },
  {
    quote: 'The live log streaming is exceptional. It feels like GitHub Actions but with the intelligence of a senior DevOps engineer.',
    author: 'Marcus R.',
    role: 'CTO',
    company: 'Strata Cloud',
    avatar: 'MR',
    gradient: 'from-blue-600 to-cyan-600',
  },
  {
    quote: 'We replaced our entire Jenkins setup with OpsPilot in one afternoon. Zero regrets.',
    author: 'Priya M.',
    role: 'Head of DevOps',
    company: 'NovaBuild',
    avatar: 'PM',
    gradient: 'from-emerald-600 to-teal-600',
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'For side projects and solo developers.',
    features: ['5 pipelines', '100 runs/month', 'Public repos only', 'Community support', '1GB artifact storage'],
    cta: 'Get started free',
    ctaHref: '/register',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'per seat/month',
    description: 'For teams shipping fast.',
    features: ['Unlimited pipelines', '10,000 runs/month', 'Private repos', 'AI RCA included', '50GB artifact storage', 'Priority support', 'RBAC & audit logs'],
    cta: 'Start free trial',
    ctaHref: '/register?plan=pro',
    highlighted: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large teams with custom needs.',
    features: ['Everything in Pro', 'Dedicated clusters', 'SAML SSO', 'SLA 99.9%', 'Custom integrations', 'Dedicated support', 'On-prem option'],
    cta: 'Talk to sales',
    ctaHref: 'mailto:sales@opspilot.io',
    highlighted: false,
    badge: null,
  },
];

const FAQS = [
  {
    q: 'How long does it take to set up?',
    a: 'Under 5 minutes. Connect your GitHub repo, and OpsPilot auto-generates the pipeline from your code.',
  },
  {
    q: 'Do I need to write YAML or config files?',
    a: 'No. OpsPilot scans your repository structure and builds the pipeline automatically.',
  },
  {
    q: 'What languages and frameworks are supported?',
    a: 'Node.js, Python, Go, Ruby, Java, and Rust — with Dockerfile auto-detection for any stack.',
  },
  {
    q: 'Is my source code secure?',
    a: 'Yes. Every build runs in an ephemeral, isolated Docker container that is destroyed immediately after the run.',
  },
];

const TERMINAL_LINES = [
  { delay: 0,    color: 'text-zinc-500', text: '$ git push origin main' },
  { delay: 300,  color: 'text-violet-400', text: '⚡ OpsPilot detected push · Queuing run...' },
  { delay: 700,  color: 'text-zinc-400', text: '▶ Cloning repository...' },
  { delay: 1000, color: 'text-emerald-400', text: '✓ Clone complete (1.2s)' },
  { delay: 1300, color: 'text-zinc-400', text: '▶ Installing dependencies...' },
  { delay: 1600, color: 'text-emerald-400', text: '✓ Install complete (8.4s)' },
  { delay: 1900, color: 'text-zinc-400', text: '▶ Building Docker image...' },
  { delay: 2200, color: 'text-emerald-400', text: '✓ Build complete (14.2s)' },
  { delay: 2500, color: 'text-zinc-400', text: '▶ Running test suite...' },
  { delay: 2800, color: 'text-emerald-400', text: '✓ Tests passed (84/84) · 3.1s' },
  { delay: 3100, color: 'text-zinc-400', text: '▶ Deploying to production...' },
  { delay: 3400, color: 'text-emerald-400', text: '✓ Health check · HTTP 200 OK' },
  { delay: 3700, color: 'text-white font-semibold', text: '🚀 Deployed in 27.1s' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 font-sans overflow-x-hidden">
      {/* ── NAVBAR ─────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1C1C1F] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-violet-500/30 transition-shadow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">OpsPilot</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="/docs" className="hover:text-white transition-colors">Docs</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors font-medium">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-violet-600/15 via-blue-600/8 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-600/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-blue-600/6 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-glow" />
            Autonomous CI/CD — No YAML. No Config. Just push.
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6 animate-slide-up">
            Ship code faster with{' '}
            <span className="gradient-text">AI-powered</span>
            {' '}DevOps
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up delay-150">
            OpsPilot automatically builds, tests, and deploys your application from a single{' '}
            <code className="font-mono text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded">git push</code>.
            No pipelines to configure. No YAML to write.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 animate-slide-up delay-200">
            <Link
              href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-violet-500/25"
            >
              Start deploying free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#3F3F46] text-zinc-200 font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Continue with GitHub (Demo)
            </Link>
          </div>

          {/* Terminal Demo */}
          <div className="max-w-2xl mx-auto rounded-xl overflow-hidden border border-[#27272A] shadow-2xl shadow-black/50 animate-slide-up delay-300">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#18181B] border-b border-[#27272A]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-2 text-xs text-zinc-500 font-mono">opspilot — live run</span>
            </div>
            {/* Terminal Body */}
            <div className="terminal p-5 text-left space-y-1">
              {TERMINAL_LINES.map((line, i) => (
                <div
                  key={i}
                  className={`${line.color} animate-slide-up`}
                  style={{ animationDelay: `${line.delay}ms`, animationFillMode: 'both' }}
                >
                  {line.text}
                </div>
              ))}
              <div className="flex items-center gap-1 mt-2">
                <span className="text-zinc-500">$</span>
                <span className="w-1.5 h-4 bg-violet-400 animate-terminal-cursor rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────── */}
      <section className="py-8 border-y border-[#1C1C1F] bg-[#111113]">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '12,400+', label: 'Pipelines deployed' },
            { value: '99.94%', label: 'Uptime SLA' },
            { value: '27s', label: 'Avg deploy time' },
            { value: '2,100+', label: 'Teams worldwide' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold gradient-text mb-1">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-violet-400 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything DevOps should be</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Opinionated defaults. No configuration required. Enterprise features out of the box.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`card-hover group p-5 rounded-xl border ${f.border} bg-gradient-to-br ${f.gradient} backdrop-blur-sm relative overflow-hidden animate-slide-up`}
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO PIPELINE VISUAL ───────────── */}
      <section className="py-20 px-6 bg-[#111113] border-y border-[#1C1C1F]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-3">Live Pipeline</p>
            <h2 className="text-3xl font-bold text-white mb-4">Watch your code ship in real-time</h2>
          </div>
          <div className="rounded-xl border border-[#27272A] bg-[#0A0A0D] overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#27272A] bg-[#111113]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/70" />
                <div className="w-2 h-2 rounded-full bg-amber-500/70" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
              </div>
              <span className="ml-2 text-xs font-mono text-zinc-500">production / app-backend — run_1753942831456</span>

              <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                SUCCESS · 27.1s
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[
                { stage: 'Clone', pct: 100, time: '1.2s', done: true },
                { stage: 'Install', pct: 100, time: '8.4s', done: true },
                { stage: 'Build', pct: 100, time: '14.2s', done: true },
                { stage: 'Test', pct: 100, time: '3.1s', done: true },
                { stage: 'Deploy', pct: 100, time: '0.2s', done: true },
              ].map((step) => (
                <div key={step.stage} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-zinc-500 font-mono shrink-0">{step.stage}</div>
                  <div className="flex-1 h-1.5 rounded-full bg-[#18181B] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
                      style={{ width: `${step.pct}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-xs text-emerald-400 font-mono shrink-0">{step.time}</div>
                  <div className="text-emerald-400 text-xs shrink-0">✓</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl font-bold text-white mb-4">Loved by engineering teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="card-hover p-6 rounded-xl bg-[#111113] border border-[#27272A] flex flex-col gap-4">
                <p className="text-zinc-300 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-2 border-t border-[#1C1C1F]">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.author}</p>
                    <p className="text-[11px] text-zinc-500">{t.role} · {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-[#111113] border-y border-[#1C1C1F]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-emerald-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-zinc-400">Start free, upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`card-hover rounded-xl p-6 flex flex-col gap-5 relative overflow-hidden ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-violet-600/15 to-blue-600/10 border border-violet-500/40 shadow-xl shadow-violet-500/10'
                    : 'bg-[#18181B] border border-[#27272A]'
                }`}
              >
                {plan.badge && (
                  <div className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 text-white">
                    {plan.badge}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-xs text-zinc-500">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                      <svg className="text-emerald-400 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                    plan.highlighted
                      ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg hover:shadow-violet-500/25'
                      : 'bg-[#27272A] hover:bg-[#3F3F46] text-zinc-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl bg-[#111113] border border-[#27272A] overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-zinc-200 hover:text-white list-none">
                  {faq.q}
                  <svg className="shrink-0 text-zinc-500 group-open:rotate-180 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <p className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed border-t border-[#1C1C1F] pt-4">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ────────────────────────── */}
      <section className="py-20 px-6 border-t border-[#1C1C1F]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to ship faster?
          </h2>
          <p className="text-zinc-400 mb-8">Join 2,100+ engineering teams already using OpsPilot.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all hover:-translate-y-0.5 shadow-xl hover:shadow-violet-500/30"
          >
            Start for free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <p className="text-xs text-zinc-600 mt-4">No credit card required · Deploy in 5 minutes</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="border-t border-[#1C1C1F] py-10 px-6 bg-[#111113]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span className="text-sm font-bold text-white">OpsPilot</span>
            <span className="text-xs text-zinc-600 ml-2">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Docs</a>
            <a href="https://github.com" className="hover:text-zinc-300 transition-colors">GitHub</a>
            <a href="https://twitter.com" className="hover:text-zinc-300 transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
