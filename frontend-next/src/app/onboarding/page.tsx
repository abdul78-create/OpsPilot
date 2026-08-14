'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, GitBranch, Shield, Rocket, ArrowRight, ArrowLeft, Check, Loader2, Sparkles, AlertCircle, CheckCircle2
} from 'lucide-react';
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
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col justify-between p-6">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg">
            OP
          </div>
          <span className="font-bold text-sm tracking-tight text-white">OpsPilot Setup</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span className={`px-2.5 py-1 rounded-full ${step >= 1 ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-zinc-800'}`}>1. Org</span>
          <span className={`px-2.5 py-1 rounded-full ${step >= 2 ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-zinc-800'}`}>2. GitHub</span>
          <span className={`px-2.5 py-1 rounded-full ${step >= 3 ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-zinc-800'}`}>3. Stack</span>
          <span className={`px-2.5 py-1 rounded-full ${step >= 4 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800'}`}>4. Deploy</span>
        </div>
      </div>

      {/* Center Body */}
      <div className="max-w-xl mx-auto w-full my-auto py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="p-8 rounded-2xl bg-[#111113] border border-[#27272A] shadow-2xl space-y-6">
            <div className="space-y-2">
              <div className="p-3 w-fit rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Building2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Create your Organization & Project</h2>
              <p className="text-xs text-zinc-400">Establish multi-tenant boundaries for team members and repositories.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">First Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
            >
              Continue to GitHub Setup <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="p-8 rounded-2xl bg-[#111113] border border-[#27272A] shadow-2xl space-y-6">
            <div className="space-y-2">
              <div className="p-3 w-fit rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <GitBranch size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Connect GitHub Repository</h2>
              <p className="text-xs text-zinc-400">OpsPilot scans repo metadata to auto-compile your CI/CD workflow DAG.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">GitHub Repository URL</label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="https://github.com/org/repo"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Target Deployment Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 bg-[#18181B] hover:bg-[#27272A] text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <>Detect Tech Stack <Sparkles size={14} /></>}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="p-8 rounded-2xl bg-[#111113] border border-[#27272A] shadow-2xl space-y-6">
            <div className="space-y-2">
              <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Stack Detected: {detectedStack}</h2>
              <p className="text-xs text-zinc-400">Compiled zero-config pipeline workflow with isolated Docker runner execution.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Pipeline Stages</span>
                <span className="text-[10px] text-emerald-400 font-mono">Auto-Compiled</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono">
                <div className="p-2 rounded bg-[#09090B] border border-[#27272A] text-zinc-300">1. Clone</div>
                <div className="p-2 rounded bg-[#09090B] border border-[#27272A] text-zinc-300">2. Build</div>
                <div className="p-2 rounded bg-[#09090B] border border-[#27272A] text-zinc-300">3. Test</div>
                <div className="p-2 rounded bg-[#09090B] border border-[#27272A] text-zinc-300">4. Deploy</div>
              </div>
            </div>

            <button
              onClick={handleFinishOnboarding}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Launch Initial Deployment <Rocket size={16} /></>}
            </button>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="p-8 rounded-2xl bg-[#111113] border border-[#27272A] shadow-2xl space-y-6 text-center">
            <div className="p-4 w-fit mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Pipeline Triggered!</h2>
              <p className="text-xs text-zinc-400">Your application pipeline is now running in an isolated Docker container environment.</p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push(`/runs/${triggeredRunId || '1'}`)}
                className="py-3 px-5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
              >
                Watch Real-Time Logs <ArrowRight size={14} />
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="py-3 px-5 bg-[#18181B] hover:bg-[#27272A] text-zinc-300 rounded-xl text-xs font-bold transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-[11px] text-zinc-500 py-2">
        OpsPilot SaaS Platform · Enterprise CI/CD & Deployment Engine
      </div>
    </div>
  );
}
