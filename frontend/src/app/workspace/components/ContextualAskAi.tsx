'use client';

import React, { useState } from 'react';
import {
  Sparkles, Send, MessageSquare, ArrowRight,
  CheckCircle2, AlertCircle, HelpCircle
} from 'lucide-react';
import { queryAi, AiQueryResponse } from '@/lib/apiClient';

interface ContextualAskAiProps {
  workspace: 'pipeline' | 'observability' | 'deployment' | 'security';
  projectId?: string;
  pipelineId?: string;
  runId?: string;
  deploymentId?: string;
}

export const ContextualAskAi: React.FC<ContextualAskAiProps> = ({
  workspace,
  projectId,
  pipelineId,
  runId,
  deploymentId,
}) => {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [response, setResponse] = useState<AiQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    setError(null);
    try {
      const res = await queryAi({
        workspace,
        projectId,
        pipelineId,
        runId,
        deploymentId,
        question: question.trim(),
      });
      setResponse(res.data);
    } catch (err) {
      setError((err as Error).message || 'Failed to query AI assistant.');
    } finally {
      setAsking(false);
    }
  };

  const sampleQuestions = {
    pipeline: [
      'How can I optimize this pipeline build stage?',
      'Can any stages run in parallel?',
      'Are tests properly cached?',
    ],
    observability: [
      'Why did the latest pipeline execution fail?',
      'Are there any recurring memory spikes?',
      'What is the average queue wait time?',
    ],
    deployment: [
      'What are the risk factors for this release?',
      'Has the health check probe verified HTTP 200?',
      'Is rollback guard configured?',
    ],
    security: [
      'Are there plaintext secrets in this configuration?',
      'Are runner privileges restricted?',
      'How do I rotate the encryption keys?',
    ],
  };

  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Ask AI about this {workspace}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Context-aware assistant analyzing live telemetry and configuration
            </p>
          </div>
        </div>
      </div>

      {/* Suggested quick chips */}
      <div className="flex flex-wrap gap-2">
        {sampleQuestions[workspace].map((q, idx) => (
          <button
            key={idx}
            onClick={() => setQuestion(q)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Query Form */}
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          placeholder={`Ask OpsPilot AI about ${workspace} context...`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="flex-1 px-3.5 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className={`w-3.5 h-3.5 ${asking ? 'animate-spin' : ''}`} />
          {asking ? 'Thinking...' : 'Ask AI'}
        </button>
      </form>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Structured AI Answer */}
      {response && (
        <div className="p-4 rounded-lg bg-[var(--surface-secondary)]/70 border border-indigo-500/20 space-y-3 animate-slide-up text-xs">
          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            {response.summary}
          </div>

          {/* Findings */}
          {response.findings.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-[var(--text-muted)] text-[11px] uppercase tracking-wider">
                Key Findings:
              </div>
              {response.findings.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[var(--text-secondary)]">
                  <span className="text-indigo-500">•</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Evidence */}
          {response.evidence.length > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-[var(--text-muted)] text-[11px] uppercase tracking-wider">
                Telemetry Evidence:
              </div>
              {response.evidence.map((ev, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[var(--text-secondary)] font-mono text-[11px]">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{ev}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className="p-2.5 rounded-md bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
            <span className="font-semibold text-indigo-500">Recommendation: </span>
            {response.recommendation}
          </div>

          <div className="text-[11px] text-[var(--text-muted)] italic">
            Next Action: {response.nextAction}
          </div>
        </div>
      )}
    </div>
  );
};
