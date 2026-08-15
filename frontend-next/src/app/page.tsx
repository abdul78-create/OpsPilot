import React from 'react';
import Link from 'next/link';

/* ─── Landing Page ─────────────────────────────────────────── */
export const dynamic = 'force-static';

const FEATURES = [
  {
    icon: '⚡',
    title: 'Zero-Config CI/CD',
    description: 'Push code, OpsPilot scans your repo, builds the pipeline DAG, and ships — no YAML required.',
  },
  {
    icon: '🐳',
    title: 'Isolated Docker Builds',
    description: 'Every run gets an ephemeral Docker workspace. No shared state, no dependency conflicts, ever.',
  },
  {
    icon: '📡',
    title: 'Live Log Streaming',
    description: 'Watch your build in real-time with Server-Sent Events. Every stdout line, instantly.',
  },
  {
    icon: '🔒',
    title: 'HMAC-Verified Webhooks',
    description: 'Every GitHub push is HMAC-SHA256 verified. Invalid signatures are rejected before processing.',
  },
  {
    icon: '🔄',
    title: 'Auto Rollback',
    description: 'Health checks fail? OpsPilot detects it and rolls back the deployment automatically.',
  },
  {
    icon: '🤖',
    title: 'AI Root Cause Analysis',
    description: 'Failed build? Our AI analyzes logs and pinpoints the exact error with fix suggestions.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'OpsPilot cut our deployment time from 40 minutes to under 3. The AI RCA alone saved us 6 hours this month.',
    author: 'Sarah K.',
    role: 'Platform Engineering Lead',
    company: 'Enterprise Engineering',
    avatar: 'SK',
  },
  {
    quote: 'The live log streaming is exceptional. It feels like GitHub Actions but with the intelligence of a senior DevOps engineer.',
    author: 'Marcus R.',
    role: 'CTO',
    company: 'Strata Cloud',
    avatar: 'MR',
  },
  {
    quote: 'We replaced our entire Jenkins setup with OpsPilot in one afternoon. Zero regrets.',
    author: 'Priya M.',
    role: 'Head of DevOps',
    company: 'NovaBuild',
    avatar: 'PM',
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
  { text: '$ git push origin main', color: 'var(--text-muted)' },
  { text: '⚡ OpsPilot detected push · Queuing run...', color: 'var(--accent)' },
  { text: '▶ Cloning repository...', color: 'var(--text-secondary)' },
  { text: '✓ Clone complete (1.2s)', color: 'var(--success)' },
  { text: '▶ Installing dependencies...', color: 'var(--text-secondary)' },
  { text: '✓ Install complete (8.4s)', color: 'var(--success)' },
  { text: '▶ Building Docker image...', color: 'var(--text-secondary)' },
  { text: '✓ Build complete (14.2s)', color: 'var(--success)' },
  { text: '▶ Running test suite...', color: 'var(--text-secondary)' },
  { text: '✓ Tests passed (84/84) · 3.1s', color: 'var(--success)' },
  { text: '▶ Deploying to production...', color: 'var(--text-secondary)' },
  { text: '✓ Health check · HTTP 200 OK', color: 'var(--success)' },
  { text: '🚀 Deployed in 27.1s', color: 'var(--text-primary)' },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen font-sans overflow-x-hidden"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* ── NAVBAR ─────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group text-decoration-none">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              OP
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              OpsPilot
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            <a href="#features" className="hover:opacity-80 transition-opacity">Features</a>
            <a href="#pricing" className="hover:opacity-80 transition-opacity">Pricing</a>
            <a href="#faq" className="hover:opacity-80 transition-opacity">FAQ</a>
            <a href="/docs" className="hover:opacity-80 transition-opacity">Docs</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
            Autonomous CI/CD — Zero YAML. Zero Config. Just git push.
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
            Ship code faster with autonomous DevOps
          </h1>

          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            OpsPilot automatically builds, tests, and deploys your applications in isolated container runtimes.
            Continuous delivery designed for modern engineering teams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <span>Start deploying free</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-xl border text-xs font-bold transition-colors"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              Sign in to Console
            </Link>
          </div>

          {/* Terminal Demo */}
          <div
            className="max-w-2xl mx-auto rounded-xl overflow-hidden border mt-12 text-left"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            {/* Terminal Header */}
            <div
              className="flex items-center gap-2 px-4 py-2.5 border-b"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--error)' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--success)' }} />
              </div>
              <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>opspilot — live workflow</span>
            </div>
            {/* Terminal Body */}
            <div className="p-5 space-y-1.5 font-mono text-xs" style={{ background: 'var(--bg-primary)' }}>
              {TERMINAL_LINES.map((line, i) => (
                <div key={i} style={{ color: line.color }}>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────── */}
      <section className="py-8 border-y" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '12,400+', label: 'Pipelines deployed' },
            { value: '99.94%', label: 'Uptime SLA' },
            { value: '27s', label: 'Avg deploy time' },
            { value: '2,100+', label: 'Teams worldwide' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>Features</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Everything DevOps should be</h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>Opinionated defaults. Zero complex configuration required. Enterprise features out of the box.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-xl border transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO PIPELINE VISUAL ───────────── */}
      <section className="py-20 px-6 border-y" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>Live Pipeline</p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Watch your code ship in real-time</h2>
          </div>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3 border-b"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--error)' }} />
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
              </div>
              <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>production / app-backend — run_1753942831456</span>

              <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--success)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
                SUCCESS · 27.1s
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[
                { stage: 'Clone', pct: 100, time: '1.2s' },
                { stage: 'Install', pct: 100, time: '8.4s' },
                { stage: 'Build', pct: 100, time: '14.2s' },
                { stage: 'Test', pct: 100, time: '3.1s' },
                { stage: 'Deploy', pct: 100, time: '0.2s' },
              ].map((step) => (
                <div key={step.stage} className="flex items-center gap-3">
                  <div className="w-16 text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>{step.stage}</div>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${step.pct}%`, background: 'var(--accent)' }}
                    />
                  </div>
                  <div className="w-12 text-right text-xs font-mono shrink-0" style={{ color: 'var(--success)' }}>{step.time}</div>
                  <div className="text-xs shrink-0" style={{ color: 'var(--success)' }}>✓</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>Testimonials</p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Loved by engineering teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.author}
                className="p-6 rounded-xl border flex flex-col gap-4"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t.author}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.role} · {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 border-y" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>Pricing</p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Simple, transparent pricing</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Start free, upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl p-6 flex flex-col gap-5 relative overflow-hidden border transition-all"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: plan.highlighted ? 'var(--accent)' : 'var(--border)',
                  boxShadow: plan.highlighted ? 'var(--shadow-md)' : 'none',
                }}
              >
                {plan.badge && (
                  <div
                    className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    {plan.badge}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{plan.price}</span>
                    {plan.period && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>}
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--success)' }}><polyline points="20 6 9 17 4 12"/></svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className="block text-center py-2.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: plan.highlighted ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: plan.highlighted ? 'var(--accent-fg)' : 'var(--text-primary)',
                    border: plan.highlighted ? 'none' : '1px solid var(--border)',
                  }}
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
        <div className="max-w-2xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>FAQ</p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border overflow-hidden"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                <summary
                  className="flex items-center justify-between px-5 py-4 cursor-pointer text-xs font-semibold list-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>{faq.q}</span>
                  <svg className="shrink-0 group-open:rotate-180 transition-transform" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <p
                  className="px-5 pb-5 text-xs leading-relaxed border-t pt-4"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ────────────────────────── */}
      <section className="py-20 px-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Ready to ship faster?
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Join 2,100+ engineering teams already using OpsPilot.</p>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <span>Start for free</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No credit card required · Deploy in 5 minutes</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="border-t py-10 px-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center font-bold text-[10px]"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              OP
            </div>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>OpsPilot</span>
            <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>© 2026</span>
          </div>
          <div className="flex items-center gap-6" style={{ color: 'var(--text-muted)' }}>
            <a href="#" className="hover:opacity-80 transition-opacity">Privacy</a>
            <a href="#" className="hover:opacity-80 transition-opacity">Terms</a>
            <a href="/docs" className="hover:opacity-80 transition-opacity">Docs</a>
            <a href="https://github.com" className="hover:opacity-80 transition-opacity">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
