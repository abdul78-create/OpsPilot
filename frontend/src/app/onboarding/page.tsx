'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, GitBranch, Shield, Rocket, ArrowRight, ArrowLeft, Check, Loader2, Sparkles, AlertCircle, CheckCircle2
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { createProject, createPipelineFromRepo, triggerPipeline } from '@/lib/apiClient';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [orgName, setOrgName] = useState("Abdul's Organization");
  const [projectName, setProjectName] = useState('Production Microservices');
  const [repoUrl, setRepoUrl] = useState('https://github.com/expressjs/express');
  const [branch, setBranch] = useState('main');
  const [detectedStack, setDetectedStack] = useState('Node.js / Express');

  // Trigger State
  const [triggeredRunId, setTriggeredRunId] = useState<string | null>(null);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !projectName.trim()) {
      setError('Please provide an organization and project name.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please provide a valid GitHub repository URL.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (repoUrl.includes('python')) setDetectedStack('Python / FastAPI');
      else if (repoUrl.includes('go')) setDetectedStack('Go / Gin');
      else setDetectedStack('Node.js / Express');
      setStep(3);
    } catch {
      setError('Failed to scan GitHub repository.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishOnboarding = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create Project
      const projRes = await createProject(projectName, `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`);
      const projectId = projRes.data.id;

      // 2. Create Pipeline from Repo
      const pipeRes = await createPipelineFromRepo(projectId, repoUrl, branch);
      const pipelineId = pipeRes.data.id;

      // 3. Trigger Initial Deployment
      const runRes = await triggerPipeline(pipelineId, branch);
      const runId = runRes.data.id;

      setTriggeredRunId(runId);
      setStep(4);
    } catch {
      setError('Onboarding setup failed. Defaulting to dashboard.');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-6"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Top Header */}
      <div
        className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            OP
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
            OpsPilot Setup
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {[
              { num: 1, label: '1. Org' },
              { num: 2, label: '2. GitHub' },
              { num: 3, label: '3. Stack' },
              { num: 4, label: '4. Deploy' },
            ].map(s => {
              const active = step >= s.num;
              return (
                <span
                  key={s.num}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: active ? 'var(--accent-fg)' : 'var(--text-muted)',
                  }}
                >
                  {s.label}
                </span>
              );
            })}
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Center Body */}
      <div className="max-w-xl mx-auto w-full my-auto py-8">
        {error && (
          <div
            className="mb-6 p-4 rounded-xl text-xs flex items-center gap-3 border"
            style={{
              background: 'var(--error-dim)',
              borderColor: 'var(--error)',
              color: 'var(--error)',
            }}
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <form
            onSubmit={handleStep1}
            className="p-8 rounded-2xl border space-y-6"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="space-y-2">
              <div
                className="p-3 w-fit rounded-xl border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <Building2 size={22} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Create your Organization & Project</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Establish multi-tenant boundaries for team members and repositories.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  First Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <span>Continue to GitHub Setup</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form
            onSubmit={handleStep2}
            className="p-8 rounded-2xl border space-y-6"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="space-y-2">
              <div
                className="p-3 w-fit rounded-xl border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <GitBranch size={22} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Connect GitHub Repository</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>OpsPilot scans repo metadata to auto-compile your CI/CD workflow DAG.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="https://github.com/org/repo"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Target Deployment Branch
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <><span>Detect Tech Stack</span><Sparkles size={14} /></>}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div
            className="p-8 rounded-2xl border space-y-6"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div className="space-y-2">
              <div
                className="p-3 w-fit rounded-xl border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <Sparkles size={22} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Stack Detected: {detectedStack}</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Compiled zero-config pipeline workflow with isolated Docker runner execution.</p>
            </div>

            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Pipeline Stages</span>
                <span
                  className="text-[10px] font-mono border px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--success-dim)',
                    borderColor: 'var(--success)',
                    color: 'var(--success)',
                  }}
                >
                  Auto-Compiled
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono">
                {['1. Clone', '2. Build', '3. Test', '4. Deploy'].map(stage => (
                  <div
                    key={stage}
                    className="p-2 rounded-lg border font-semibold"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    {stage}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleFinishOnboarding}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Launch Initial Deployment</span><Rocket size={16} /></>}
            </button>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div
            className="p-8 rounded-2xl border space-y-6 text-center"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div
              className="p-4 w-fit mx-auto rounded-full border"
              style={{
                background: 'var(--success-dim)',
                borderColor: 'var(--success)',
                color: 'var(--success)',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pipeline Triggered!</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your application pipeline is now running in an isolated Docker container environment.</p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push(`/runs/${triggeredRunId || '1'}`)}
                className="py-3 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <span>Watch Real-Time Logs</span>
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="py-3 px-5 border rounded-xl text-xs font-bold transition-all"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-[11px] py-2" style={{ color: 'var(--text-muted)' }}>
        OpsPilot SaaS Platform · Enterprise CI/CD & Deployment Engine
      </div>
    </div>
  );
}
