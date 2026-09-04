'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import {
  GitBranch, Terminal, Shield, Cpu, Activity, ArrowRight,
  CheckCircle2, Play, Zap, Layers, RefreshCw, Server,
  Lock, Eye, AlertTriangle, Sparkles, Box, FileCode, Check,
  ChevronRight, ArrowUpRight, HardDrive, Compass, Command,
} from 'lucide-react';

/* ─── Data Definitions ─────────────────────────────────────────── */

const WORKFLOW_STEPS = [
  {
    num: '01',
    id: 'connect',
    title: 'Connect Repository',
    tagline: 'GitHub App & HMAC Webhooks',
    desc: 'Connect your public or private GitHub repository in seconds. OpsPilot sets up cryptographically verified HMAC-SHA256 webhook delivery, automatically tracking commits and branch updates.',
    features: ['GitHub App & OAuth integration', 'HMAC-SHA256 signature verification', 'Branch & commit discovery', 'Zero YAML prerequisite'],
    codeSnippet: `$ opspilot repo connect --provider github \\
  --repo abdul78-create/OpsPilot --branch main
✓ Webhook registered: wh_84920481 (active)
✓ HMAC secret generated and stored in Vault
✓ Repository synced: 1 branch, latest commit 8b4ef21`,
  },
  {
    num: '02',
    id: 'build',
    title: 'Build Pipeline DAG',
    tagline: 'Visual Drag-and-Drop Canvas',
    desc: 'Construct multi-stage delivery pipelines visually. Connect Source, Docker Build, Jest/Pytest, Trivy Security, Approval Gates, and Deployments with real-time topological cycle validation.',
    features: ['Visual node palette & inspectors', 'Cycle & dependency DAG validation', 'Bi-directional YAML export/import', 'Multi-stage parallel execution'],
    codeSnippet: `pipeline:
  name: "Production Delivery Pipeline"
  trigger:
    branch: "main"
    events: ["push"]
  stages:
    - name: "build"
      steps: [{ name: "docker-build", image: "node:20-alpine" }]
    - name: "test"
      depends_on: ["build"]
      steps: [{ name: "unit-tests", command: "npm test -- --ci" }]
    - name: "security"
      depends_on: ["build"]
      steps: [{ name: "trivy-scan", target: "workspace" }]`,
  },
  {
    num: '03',
    id: 'execute',
    title: 'Ephemeral Execution',
    tagline: 'Isolated Docker Worker Pool',
    desc: 'Every pipeline run executes inside an isolated Docker container managed by the OpsPilot Worker pool. Ephemeral workspaces ensure zero shared state, clean dependencies, and deterministic builds.',
    features: ['Isolated Docker container runtime', 'BullMQ asynchronous job queue', 'Per-run volume workspace isolation', 'Automatic workspace teardown'],
    codeSnippet: `[Worker-1] Claimed job 'run_8941_step_build' from queue
[Worker-1] Mounting ephemeral workspace /tmp/opspilot/run_8941
[Worker-1] Spawning container: node:20-alpine
[Worker-1] Executing step command in isolated cgroup
[Worker-1] Exit code 0 · Uploading artifact (14.2 MB)
[Worker-1] Cleaning up container workspace... DONE`,
  },
  {
    num: '04',
    id: 'diagnose',
    title: 'Live Logs & AI Diagnosis',
    tagline: 'SSE Streaming & Root Cause Analysis',
    desc: 'Watch build progress line-by-line with real-time Server-Sent Events (SSE). When a compiler or test fails, our integrated AI analyzes stack traces and generates unified git patches.',
    features: ['Sub-second SSE log streaming', 'Structured log level filtering', 'AI Root Cause Analysis (Gemini)', 'Suggested CLI fixes & patch diffs'],
    codeSnippet: `[AI RCA] Triggered for Run #8941 (Stage: 'test' FAILED)
[AI RCA] Root Cause: TypeScript compilation error in src/auth.ts (TS2304)
[AI RCA] Confidence Score: 94% · Risk Level: HIGH
[AI RCA] Suggested Fix:
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -14,1 +14,1 @@
- const token = generateToken(user.id);
+ const token = await this.jwtService.signAsync({ sub: user.id });`,
  },
  {
    num: '05',
    id: 'deploy',
    title: 'Deploy & Observe',
    tagline: 'Environment Rollouts & Prometheus Metrics',
    desc: 'Promote verified builds to Staging or Production environments. Monitor delivery velocity, runner queue depth, duration percentiles, and error rates via native Prometheus telemetry.',
    features: ['Multi-environment promotion', 'Automated health-check probes', 'One-click instant rollback', 'Prometheus telemetry & SLO monitoring'],
    codeSnippet: `[Deployer] Target environment: Production (prod-us-east-1)
[Deployer] Applying release version v1.4.2...
[Deployer] Probing health: GET /v1/health -> HTTP 200 OK (14ms)
[Deployer] Deployment SUCCESS · Active version updated
[Prometheus] Metric recorded: opspilot_deployment_duration_seconds=18.4`,
  },
];

const SOLVES_ITEMS = [
  {
    icon: FileCode,
    problem: 'Frustrating YAML Configuration',
    solution: 'Visual DAG Builder',
    detail: 'Build multi-stage pipelines visually with instant cycle detection and validation before execution.',
  },
  {
    icon: Layers,
    problem: 'Fragmented DevOps Tooling',
    solution: 'Unified Control Plane',
    detail: 'Repositories, pipelines, live logs, secrets vault, and deployments unified in a single responsive UI.',
  },
  {
    icon: Terminal,
    problem: 'Disconnected Build Logs',
    solution: 'Real-Time SSE Streaming',
    detail: 'Live terminal streaming connected directly to individual stage nodes for instant visibility.',
  },
  {
    icon: Sparkles,
    problem: 'Cryptic Pipeline Failures',
    solution: 'AI Root Cause Analysis',
    detail: 'Automatic failure diagnosis with concrete remediation commands and unified git patch diffs.',
  },
  {
    icon: Server,
    problem: 'Inconsistent Local vs CI State',
    solution: 'Isolated Ephemeral Runners',
    detail: 'Every step runs in a clean Docker container with zero artifact leakage or dependency pollution.',
  },
  {
    icon: Activity,
    problem: 'Blind Deployments & Outages',
    solution: 'Prometheus-Backed Observability',
    detail: 'Live cluster health, duration percentiles, and instant rollback capabilities out of the box.',
  },
];

/* ─── Component ─────────────────────────────────────────────────── */

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div
      className="min-h-screen font-sans overflow-x-hidden"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── BACKGROUND GLOW EFFECT ─────────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{ opacity: 0.6 }}
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[140px]"
          style={{ background: 'var(--accent-glow)' }}
        />
        <div
          className="absolute top-[800px] right-0 w-[500px] h-[500px] rounded-full blur-[160px]"
          style={{ background: 'var(--info-dim)' }}
        />
      </div>

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl transition-colors"
        style={{
          background: 'var(--bg-overlay)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group text-decoration-none">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-md transition-transform group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--info))',
                color: '#FFFFFF',
              }}
            >
              OP
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                OpsPilot
              </span>
              <span className="text-[10px] font-mono tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                CONTROL PLANE
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <a href="#workflow" className="hover:text-[var(--accent)] transition-colors">Workflow</a>
            <a href="#builder" className="hover:text-[var(--accent)] transition-colors">Pipeline Builder</a>
            <a href="#execution" className="hover:text-[var(--accent)] transition-colors">Execution</a>
            <a href="#ai-rca" className="hover:text-[var(--accent)] transition-colors">AI Diagnosis</a>
            <a href="#architecture" className="hover:text-[var(--accent)] transition-colors">Architecture</a>
            <Link href="/pricing" className="hover:text-[var(--accent)] transition-colors">Pricing</Link>
            <Link href="/docs" className="hover:text-[var(--accent)] transition-colors">Docs</Link>
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:text-[var(--text-primary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm hover:opacity-90 active:scale-95 flex items-center gap-1.5"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              <span>Get Started</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ───────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 max-w-6xl mx-auto text-center z-10">
        {/* Top Product Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium mb-8 backdrop-blur-md"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-bright)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>OpsPilot 2.0</span>
          <span style={{ color: 'var(--border-bright)' }}>·</span>
          <span>Autonomous CI/CD & Delivery Control Plane</span>
        </div>

        {/* Hero Title */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 max-w-4xl mx-auto"
          style={{ color: 'var(--text-primary)' }}
        >
          Ship code with clarity. <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--accent) 0%, var(--info) 50%, var(--cyan) 100%)',
            }}
          >
            Visual pipelines. Ephemeral runners. Instant diagnosis.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p
          className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
          style={{ color: 'var(--text-secondary)' }}
        >
          Connect any GitHub repository, visually compose your multi-stage delivery DAG, execute inside isolated Docker containers, stream live logs, and diagnose failures with AI.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
          >
            <span>Get Started</span>
            <ArrowRight size={15} />
          </Link>
          <a
            href="#workflow"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border text-sm font-semibold transition-all hover:bg-[var(--bg-secondary)]"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
            }}
          >
            <Compass size={15} style={{ color: 'var(--accent)' }} />
            <span>Explore Platform</span>
          </a>
        </div>

        {/* ── Interactive Visual Workflow Ribbon ────────────── */}
        <div
          className="rounded-2xl border p-4 sm:p-6 shadow-xl backdrop-blur-md text-left transition-all"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b text-xs" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
              <Terminal size={14} style={{ color: 'var(--accent)' }} />
              <span>DELIVERY PIPELINE RUNTIME</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono border px-2 py-0.5 rounded font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                AES-256 VAULT
              </span>
              <span className="text-[10px] font-mono border px-2 py-0.5 rounded font-bold" style={{ background: 'var(--success-dim)', borderColor: 'var(--success)', color: 'var(--success)' }}>
                DOCKER ISOLATION
              </span>
            </div>
          </div>

          {/* Workflow Sequence Diagram */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs font-mono">
            {[
              { step: '01', title: 'GitHub Push', sub: 'HMAC Verified', icon: GitBranch, color: 'var(--text-primary)' },
              { step: '02', title: 'DAG Parser', sub: 'Topological Sort', icon: Layers, color: 'var(--accent)' },
              { step: '03', title: 'Docker Build', sub: 'Isolated Image', icon: Box, color: 'var(--info)' },
              { step: '04', title: 'Jest Tests', sub: 'Parallel Run', icon: CheckCircle2, color: 'var(--success)' },
              { step: '05', title: 'Trivy SAST', sub: 'Vulnerability Scan', icon: Shield, color: 'var(--warning)' },
              { step: '06', title: 'AI RCA', sub: 'Patch Diff', icon: Sparkles, color: 'var(--cyan)' },
              { step: '07', title: 'Production', sub: 'Prometheus Telemetry', icon: Activity, color: 'var(--success)' },
            ].map((node, i) => {
              const Icon = node.icon;
              return (
                <div
                  key={i}
                  className="p-3 rounded-xl border flex flex-col items-center justify-between space-y-2 transition-all hover:border-[var(--accent)]"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between w-full text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{node.step}</span>
                    <Icon size={13} style={{ color: node.color }} />
                  </div>
                  <div className="font-bold text-[11px]" style={{ color: 'var(--text-primary)' }}>{node.title}</div>
                  <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{node.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: WHAT OPSPILOT SOLVES ────────────────────── */}
      <section className="py-24 px-6 border-t z-10 relative" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
            >
              Engineered for Developer Velocity
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Eliminating the Friction in Modern Delivery
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Traditional CI/CD tools force developers into brittle YAML scripts, disconnected logs, and manual debugging. OpsPilot delivers an integrated control plane.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOLVES_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition-all hover:border-[var(--accent)] hover:shadow-md"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="space-y-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderColor: 'var(--border)',
                        color: 'var(--accent)',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono line-through opacity-70 mb-1" style={{ color: 'var(--error)' }}>
                        {item.problem}
                      </div>
                      <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        {item.solution}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: HOW OPSPILOT WORKS (5-STEP ENGINE) ──────── */}
      <section id="workflow" className="py-24 px-6 border-t z-10 relative" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
            >
              The 5-Step Delivery Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              From Commit to Production in Five Clear Stages
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Every step is executed deterministically by isolated backend workers, streaming live state back to the UI.
            </p>
          </div>

          {/* Workflow Tabs Header */}
          <div className="flex items-center justify-center gap-2 flex-wrap pb-4">
            {WORKFLOW_STEPS.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveTab(index)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
                style={{
                  background: activeTab === index ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: activeTab === index ? 'var(--accent-fg)' : 'var(--text-secondary)',
                  borderColor: activeTab === index ? 'var(--accent)' : 'var(--border)',
                  boxShadow: activeTab === index ? '0 2px 10px var(--accent-glow)' : 'none',
                }}
              >
                <span className="font-mono text-[10px] opacity-70">{step.num}</span>
                <span>{step.title}</span>
              </button>
            ))}
          </div>

          {/* Active Step Display Panel */}
          {WORKFLOW_STEPS[activeTab] && (
            <div
              className="p-8 rounded-2xl border grid grid-cols-1 lg:grid-cols-2 gap-8 items-center shadow-lg"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                    Stage {WORKFLOW_STEPS[activeTab].num} · {WORKFLOW_STEPS[activeTab].tagline}
                  </span>
                  <h3 className="text-2xl font-extrabold mt-1" style={{ color: 'var(--text-primary)' }}>
                    {WORKFLOW_STEPS[activeTab].title}
                  </h3>
                  <p className="text-xs sm:text-sm mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {WORKFLOW_STEPS[activeTab].desc}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {WORKFLOW_STEPS[activeTab].features.map((feat, fi) => (
                    <div key={fi} className="flex items-center gap-2.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      <CheckCircle2 size={15} style={{ color: 'var(--success)' }} className="shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    <span>Test This Stage in OpsPilot</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Terminal Code Execution Output */}
              <div
                className="rounded-xl border overflow-hidden font-mono text-xs shadow-inner"
                style={{
                  background: 'var(--terminal-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--terminal-text)',
                }}
              >
                <div
                  className="px-4 py-2 border-b flex items-center justify-between text-[11px]"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span className="ml-2 opacity-60">opspilot-worker ~ stdout</span>
                  </div>
                  <span className="text-[10px] opacity-40 uppercase">LIVE BUFFER</span>
                </div>
                <pre className="p-5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {WORKFLOW_STEPS[activeTab].codeSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 4: VISUAL PIPELINE BUILDER ─────────────────── */}
      <section id="builder" className="py-24 px-6 border-t z-10 relative" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
            >
              Visual DAG Orchestration
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Design Multi-Stage Delivery DAGs Without YAML Errors
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Drag, drop, and link pipeline steps. OpsPilot performs real-time cycle detection and compiles your graph into executable container jobs.
            </p>
          </div>

          {/* Builder Canvas Showcase Preview */}
          <div
            className="rounded-2xl border overflow-hidden shadow-2xl"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            {/* Top Toolbar */}
            <div
              className="h-12 px-5 border-b flex items-center justify-between text-xs"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div className="font-mono font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                  Production Delivery Pipeline · DAG v2
                </div>
                <span className="text-[10px] font-mono border px-2 py-0.5 rounded font-semibold text-[var(--success)] border-[var(--success)] bg-[var(--success-dim)]">
                  VALIDATED (ZERO CYCLES)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>Trigger: main branch push</span>
              </div>
            </div>

            {/* Simulated Interactive DAG Canvas */}
            <div className="p-8 sm:p-12 overflow-x-auto min-w-[700px]">
              <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
                {/* Node 1: Source */}
                <div className="p-4 rounded-xl border w-48 shadow-sm space-y-2 bg-[var(--bg-secondary)] border-[var(--border)]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-[var(--text-muted)]">01 TRIGGER</span>
                    <GitBranch size={13} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="font-bold text-xs text-[var(--text-primary)]">GitHub Push</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">refs/heads/main</div>
                </div>

                <ArrowRight size={18} style={{ color: 'var(--border-bright)' }} />

                {/* Node 2: Build */}
                <div className="p-4 rounded-xl border w-48 shadow-sm space-y-2 bg-[var(--bg-secondary)] border-[var(--border)]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-[var(--text-muted)]">02 BUILD</span>
                    <Box size={13} style={{ color: 'var(--info)' }} />
                  </div>
                  <div className="font-bold text-xs text-[var(--text-primary)]">Docker Container</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">node:20-alpine</div>
                </div>

                <ArrowRight size={18} style={{ color: 'var(--border-bright)' }} />

                {/* Node 3: Test & Scan */}
                <div className="p-4 rounded-xl border w-48 shadow-sm space-y-2 bg-[var(--bg-secondary)] border-[var(--border)]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-[var(--text-muted)]">03 TEST & SAST</span>
                    <Shield size={13} style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="font-bold text-xs text-[var(--text-primary)]">Jest + Trivy Scan</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">Parallel Step Group</div>
                </div>

                <ArrowRight size={18} style={{ color: 'var(--border-bright)' }} />

                {/* Node 4: Deploy */}
                <div className="p-4 rounded-xl border w-48 shadow-sm space-y-2 bg-[var(--bg-secondary)] border-[var(--border)]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-[var(--text-muted)]">04 DEPLOY</span>
                    <Activity size={13} style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="font-bold text-xs text-[var(--text-primary)]">Production Gate</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">prod-us-east-1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: REAL-TIME EXECUTION & LIVE LOGS ─────────── */}
      <section id="execution" className="py-24 px-6 border-t z-10 relative" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
            >
              Real-Time Execution Runtime
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Watch Every Byte Ship with Low-Latency SSE Logs
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No page refreshing. Server-Sent Events stream step execution stdout and stderr straight to your browser.
            </p>
          </div>

          <div
            className="rounded-2xl border p-6 shadow-xl space-y-4"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            {/* Run Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b text-xs" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse" />
                <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  RUN #10492 · main branch
                </span>
                <span className="font-mono text-[11px] opacity-70" style={{ color: 'var(--text-muted)' }}>
                  commit 8b4ef21
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span style={{ color: 'var(--text-muted)' }}>Worker: docker-pool-worker-01</span>
                <span className="border px-2 py-0.5 rounded font-bold text-[var(--success)] border-[var(--success)] bg-[var(--success-dim)]">
                  SUCCESS (28.4s)
                </span>
              </div>
            </div>

            {/* Terminal Live Log Body */}
            <div
              className="rounded-xl border p-5 font-mono text-xs space-y-1.5 overflow-x-auto shadow-inner"
              style={{
                background: 'var(--terminal-bg)',
                borderColor: 'var(--border)',
                color: 'var(--terminal-text)',
              }}
            >
              <div className="text-[var(--text-muted)]">2026-09-01T15:10:01.000Z [INFO] Initializing isolated Docker runner for job step &apos;build&apos;</div>
              <div className="text-[var(--text-secondary)]">2026-09-01T15:10:02.120Z [INFO] Mounting ephemeral directory /tmp/opspilot/runs/10492</div>
              <div className="text-[var(--text-secondary)]">2026-09-01T15:10:05.400Z [INFO] Running &apos;npm run build&apos; inside container node:20-alpine</div>
              <div className="text-[var(--success)]">2026-09-01T15:10:18.200Z [SUCCESS] ✓ Compiled successfully in 12.8s</div>
              <div className="text-[var(--text-secondary)]">2026-09-01T15:10:19.100Z [INFO] Executing step &apos;security-sast&apos; using Trivy scanner</div>
              <div className="text-[var(--success)]">2026-09-01T15:10:24.000Z [SUCCESS] ✓ Zero HIGH/CRITICAL vulnerabilities found</div>
              <div className="text-[var(--text-secondary)]">2026-09-01T15:10:25.500Z [INFO] Archiving build artifact: dist-v10492.tar.gz (18.4 MB)</div>
              <div className="text-[var(--text-primary)] font-bold">2026-09-01T15:10:28.400Z [SUCCESS] Pipeline execution finished with exit code 0.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: AI FAILURE INTELLIGENCE ─────────────────── */}
      <section id="ai-rca" className="py-24 px-6 border-t z-10 relative" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
            >
              Intelligent Root Cause Analysis
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              AI Diagnostics That Pinpoint the Exact Code Fix
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              When a pipeline stage breaks, OpsPilot parses the compiler output and stack trace, identifying the root cause and proposing a unified git patch diff.
            </p>
          </div>

          <div
            className="p-8 rounded-2xl border grid grid-cols-1 lg:grid-cols-2 gap-8 shadow-xl"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            <div className="space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]">
                  <Sparkles size={18} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Automated Failure Diagnosis
                </h3>
              </div>

              <div className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  Instead of spending hours searching through 10,000 lines of terminal logs, OpsPilot isolates the exact failed step, parses compiler warnings, and surfaces an actionable summary.
                </p>
                <p>
                  The AI provider generates:
                </p>
                <ul className="space-y-2 text-[var(--text-primary)] font-medium pl-1">
                  <li className="flex items-center gap-2">
                    <Check size={14} style={{ color: 'var(--success)' }} />
                    <span>Executive Summary & Risk Level</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} style={{ color: 'var(--success)' }} />
                    <span>Technical Root Cause explanation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} style={{ color: 'var(--success)' }} />
                    <span>Exact remediation CLI commands</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} style={{ color: 'var(--success)' }} />
                    <span>Unified Git patch diff proposal</span>
                  </li>
                </ul>
              </div>

              <div
                className="p-3 rounded-xl border text-[11px]"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <span className="font-semibold text-[var(--text-primary)]">Honest Architecture:</span> AI Root Cause Analysis activates when <code className="font-mono text-[var(--accent)]">GEMINI_API_KEY</code> is configured in your environment. If omitted, the system gracefully operates in manual inspection mode.
              </div>
            </div>

            {/* AI RCA Output Card */}
            <div
              className="p-5 rounded-xl border font-mono text-xs space-y-3 shadow-sm"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between pb-2 border-b text-[11px]" style={{ borderColor: 'var(--border)' }}>
                <span className="font-bold text-[var(--error)]">ROOT CAUSE ANALYSIS REPORT</span>
                <span className="px-2 py-0.5 rounded border text-[var(--error)] border-[var(--error)] bg-[var(--error-dim)] font-bold text-[10px]">
                  CONFIDENCE 96%
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase">Summary</span>
                <p className="text-[var(--text-primary)] font-sans text-xs mt-0.5">
                  Compilation failed due to missing return statement in Authentication Service.
                </p>
              </div>

              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase">Suggested Remediation Patch</span>
                <pre
                  className="p-3 rounded-lg border mt-1 text-[11px] overflow-x-auto whitespace-pre-wrap leading-snug"
                  style={{ background: 'var(--terminal-bg)', borderColor: 'var(--border)' }}
                >
                  <span className="text-[var(--error)]">- return this.jwtService.sign(payload);</span>{'\n'}
                  <span className="text-[var(--success)]">+ return await this.jwtService.signAsync(payload);</span>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: TECHNICAL ARCHITECTURE ──────────────────── */}
      <section id="architecture" className="py-24 px-6 border-t z-10 relative" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
            >
              Technical Infrastructure
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Built for Robust Engineering Reliability
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No black-box magic. OpsPilot is engineered with proven enterprise building blocks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-5 rounded-xl border space-y-2 bg-[var(--bg-secondary)] border-[var(--border)]">
              <div className="text-[var(--accent)] font-bold text-sm">Control Plane</div>
              <div className="text-[var(--text-primary)] font-bold">NestJS 10 + Next.js 16</div>
              <p className="text-[11px] font-sans text-[var(--text-muted)]">
                TypeScript end-to-end with strict input validation and RBAC authorization guards.
              </p>
            </div>

            <div className="p-5 rounded-xl border space-y-2 bg-[var(--bg-secondary)] border-[var(--border)]">
              <div className="text-[var(--info)] font-bold text-sm">Persistence & Queue</div>
              <div className="text-[var(--text-primary)] font-bold">PostgreSQL + BullMQ</div>
              <p className="text-[11px] font-sans text-[var(--text-muted)]">
                Prisma ORM with strict foreign keys, transactional state machines, and Redis worker queues.
              </p>
            </div>

            <div className="p-5 rounded-xl border space-y-2 bg-[var(--bg-secondary)] border-[var(--border)]">
              <div className="text-[var(--success)] font-bold text-sm">Worker Runners</div>
              <div className="text-[var(--text-primary)] font-bold">Docker Isolation</div>
              <p className="text-[11px] font-sans text-[var(--text-muted)]">
                Hermetic per-run cgroup isolation, resource limits, and automated volume teardown.
              </p>
            </div>

            <div className="p-5 rounded-xl border space-y-2 bg-[var(--bg-secondary)] border-[var(--border)]">
              <div className="text-[var(--cyan)] font-bold text-sm">Telemetry</div>
              <div className="text-[var(--text-primary)] font-bold">Prometheus Metrics</div>
              <p className="text-[11px] font-sans text-[var(--text-muted)]">
                Native OpenTelemetry tracing, p95/p99 duration histograms, and container health metrics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: FINAL CTA ───────────────────────────────── */}
      <section className="py-24 px-6 border-t text-center z-10 relative" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Turn your repository into an observable delivery pipeline.
          </h2>
          <p className="text-sm sm:text-base max-w-xl mx-auto font-normal" style={{ color: 'var(--text-secondary)' }}>
            Start building in minutes. Connect your GitHub repository and orchestrate your first pipeline visually.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-md hover:opacity-90 active:scale-95"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              <span>Get Started</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border text-sm font-semibold transition-all hover:bg-[var(--bg-primary)]"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                background: 'var(--bg-secondary)',
              }}
            >
              <span>Sign in to Control Plane</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer
        className="py-12 px-6 border-t text-xs z-10 relative"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px]"
              style={{ background: 'var(--accent)', color: '#FFFFFF' }}
            >
              OP
            </div>
            <span className="font-bold text-[var(--text-primary)]">OpsPilot AI</span>
            <span>· Enterprise CI/CD & Delivery Engine</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <Link href="/pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
            <Link href="/features" className="hover:text-[var(--text-primary)] transition-colors">Features</Link>
            <Link href="/docs" className="hover:text-[var(--text-primary)] transition-colors">Documentation</Link>
            <Link href="/security" className="hover:text-[var(--text-primary)] transition-colors">Security</Link>
            <Link href="/login" className="hover:text-[var(--text-primary)] transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
