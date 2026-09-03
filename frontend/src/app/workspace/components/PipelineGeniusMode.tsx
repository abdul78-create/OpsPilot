'use client';

import React, { useState } from 'react';
import {
  GitBranch, Sparkles, Clock, Zap, ArrowRight,
  CheckCircle2, AlertTriangle, Shield, Layers,
  ExternalLink, PlayCircle, Plus
} from 'lucide-react';
import { PipelineDefinition, PipelineRun, AiAnalysisReport, optimizePipeline, generateAiPipeline, GeneratedPipelineResult } from '@/lib/apiClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PipelineGeniusModeProps {
  pipeline: PipelineDefinition | null;
  runs: PipelineRun[];
  onReportGenerated: (report: AiAnalysisReport) => void;
}

export const PipelineGeniusMode: React.FC<PipelineGeniusModeProps> = ({
  pipeline,
  runs,
  onReportGenerated,
}) => {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [latestReport, setLatestReport] = useState<AiAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Pipeline Generator state
  const [showGenerator, setShowGenerator] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedPipelineResult | null>(null);

  if (!pipeline) {
    return (
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
          <GitBranch className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">No Pipeline Selected</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
          Select an active pipeline from the context selector above or create a new delivery pipeline with AI.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => setShowGenerator(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Pipeline with AI
          </button>
          <Link
            href="/builder"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]/80 transition-colors"
          >
            Open Visual Builder
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Calculate real run metrics for selected pipeline
  const pipelineRuns = runs.filter((r) => r.pipelineDefinitionId === pipeline.id);
  const totalRuns = pipelineRuns.length;
  const successRuns = pipelineRuns.filter((r) => r.status === 'SUCCESS').length;
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100;
  const avgDuration = totalRuns > 0
    ? Math.round(pipelineRuns.reduce((acc, r) => acc + (r.durationSeconds || 0), 0) / totalRuns)
    : 0;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await optimizePipeline(pipeline.id);
      setLatestReport(res.data);
      onReportGenerated(res.data);
    } catch (err) {
      setError((err as Error).message || 'Failed to run pipeline optimization analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGeneratePipeline = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await generateAiPipeline(prompt);
      setGeneratedResult(res.data);
    } catch (err) {
      setError((err as Error).message || 'Failed to generate pipeline.');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenInBuilder = () => {
    if (generatedResult) {
      // Store in session storage for builder pickup
      sessionStorage.setItem('opspilot_generated_pipeline', JSON.stringify(generatedResult));
    }
    router.push('/builder');
  };

  return (
    <div className="space-y-6">
      {/* ── Pipeline Overview Card ── */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{pipeline.name}</h2>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                <span className="font-mono bg-[var(--surface-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                  {pipeline.triggerBranch || 'main'}
                </span>
                <span>·</span>
                <span>Trigger: {pipeline.triggerType}</span>
                <span>·</span>
                <span>Version v{pipeline.currentVersionNumber}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)]/80 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              {showGenerator ? 'Close AI Generator' : 'Generate with AI'}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyzing Pipeline...' : 'Analyze Pipeline'}
            </button>
          </div>
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Success Rate</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {successRate}%
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{totalRuns} total runs</div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Average Duration</div>
            <div className="text-lg font-bold text-[var(--text-primary)] font-mono mt-1">
              {avgDuration}s
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Across recent sandboxes</div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Current Version</div>
            <div className="text-lg font-bold text-indigo-500 font-mono mt-1">
              v{pipeline.currentVersionNumber}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Immutable DAG spec</div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]/60">
            <div className="text-[11px] text-[var(--text-muted)] font-medium">Failed Executions</div>
            <div className="text-lg font-bold text-rose-500 font-mono mt-1">
              {pipelineRuns.filter((r) => r.status === 'FAILED').length}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">RCA candidate runs</div>
          </div>
        </div>
      </div>

      {/* ── AI Pipeline Generator Section (Collapsible) ── */}
      {showGenerator && (
        <div className="bg-[var(--surface-primary)] border border-indigo-500/30 rounded-xl p-5 shadow-sm space-y-4 animate-slide-up">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Natural Language Pipeline Generator
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Describe your application stack and delivery requirements. OpsPilot AI will generate a topologically sorted execution DAG.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Node.js backend with unit tests, Trivy SAST scan, and staging deployment"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleGeneratePipeline}
              disabled={generating || !prompt.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Generate DAG'}
            </button>
          </div>

          {/* Generated Result Preview */}
          {generatedResult && (
            <div className="p-4 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {generatedResult.summary}
                </span>
                <button
                  onClick={handleOpenInBuilder}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md transition-colors"
                >
                  Open in Pipeline Builder
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[11px] font-mono bg-slate-950 text-slate-200 p-3 rounded-md overflow-x-auto max-h-40">
                <pre>{generatedResult.yamlConfig}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Optimization Report Card ── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {latestReport && (
        <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                AI Optimization Findings & Recommendations
              </h3>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              Confidence: {Math.round(latestReport.confidenceScore * 100)}%
            </span>
          </div>

          <div className="text-xs text-[var(--text-primary)] font-medium">
            {latestReport.summary}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--text-secondary)]">Actionable Steps:</div>
            {(Array.isArray(latestReport.recommendations) ? latestReport.recommendations : []).map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--surface-secondary)]/60 border border-[var(--border-subtle)]/40 text-xs text-[var(--text-secondary)]"
              >
                <span className="text-indigo-500 font-bold text-xs">0{idx + 1}</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs border-t border-[var(--border-subtle)]/60">
            <span className="text-[var(--text-muted)]">
              Estimated execution speedup: ~{((latestReport.metadata as any)?.potentialTimeSavingsSeconds) || 0}s
            </span>
            <Link
              href="/builder"
              className="text-indigo-500 hover:text-indigo-400 font-semibold flex items-center gap-1 transition-colors"
            >
              Open Pipeline Builder
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
