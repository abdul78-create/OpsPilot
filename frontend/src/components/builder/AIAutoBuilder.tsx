'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  generateAiPipeline,
  fetchAiStatus,
  AiStatusResponse,
} from '@/lib/apiClient';

export interface GeneratedPipeline {
  nodes: Node[];
  edges: Edge[];
  name?: string;
  summary?: string;
  yamlConfig?: string;
}

interface AIAutoBuilderProps {
  onGenerate: (pipeline: GeneratedPipeline) => void;
  aiStatus?: AiStatusResponse | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AIAutoBuilder({ onGenerate, aiStatus: initialStatus }: AIAutoBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<AiStatusResponse | null>(initialStatus ?? null);
  const [statusLoading, setStatusLoading] = useState(!initialStatus);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
      setStatusLoading(false);
      return;
    }

    let isMounted = true;
    async function loadStatus() {
      setStatusLoading(true);
      try {
        const res = await fetchAiStatus();
        if (isMounted && res?.data) {
          setStatus(res.data);
        }
      } catch {
        // AI status check failed or unauthenticated; dynamic status badge handles this
      } finally {
        if (isMounted) setStatusLoading(false);
      }
    }
    loadStatus();
    return () => {
      isMounted = false;
    };
  }, [initialStatus]);

  const handleGenerate = async (overridePrompt?: string) => {
    const targetPrompt = (overridePrompt ?? prompt).trim();
    if (!targetPrompt) return;
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const res = await generateAiPipeline(targetPrompt);
      if (!res || !res.data) {
        throw new Error('No pipeline specification returned from AI service');
      }

      const { name, summary, yamlConfig, nodes, edges } = res.data;

      if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error('AI service returned an empty or invalid DAG node set');
      }

      // Pass real generated pipeline structure through existing onGenerate() flow
      onGenerate({
        nodes,
        edges: Array.isArray(edges) ? edges : [],
        name,
        summary,
        yamlConfig,
      });

      toast({
        kind: 'success',
        title: 'Pipeline Generated',
        message: summary || `Generated ${name || 'pipeline'} with ${nodes.length} stages.`,
      });

      setIsOpen(false);
      setPrompt('');
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const msg = errorObj?.message || 'Failed to generate pipeline specification';

      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        toast({
          kind: 'error',
          title: 'Authentication Required',
          message: 'Please sign in to generate pipelines with AI.',
        });
      } else if (msg.includes('503') || msg.toLowerCase().includes('not configured')) {
        toast({
          kind: 'warning',
          title: 'AI Service Not Configured',
          message: 'The AI service is not configured. Configure GEMINI_API_KEY in backend settings.',
        });
      } else {
        toast({
          kind: 'error',
          title: 'AI Generation Failed',
          message: msg,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const examples = [
    'Deploy my Next.js app to Railway with Trivy security scan',
    'Go API to Kubernetes with tests and security',
    'FastAPI app to Cloud Run with PyTest',
    'Node.js microservice to Staging with Jest and Docker build',
  ];

  // Dynamic status badge presentation
  let badgeLabel = 'Checking…';
  let badgeClass = 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border)]';

  if (!statusLoading) {
    if (status?.status === 'connected') {
      badgeLabel = status.provider ? `${status.provider}` : 'Ready';
      badgeClass = 'bg-[var(--success-dim)] text-[var(--success)] border-[var(--success)]';
    } else if (status && !status.configured) {
      badgeLabel = 'Not Configured';
      badgeClass = 'bg-[var(--warning-dim)] text-[var(--warning)] border-[var(--warning)]';
    } else if (status?.status === 'unavailable') {
      badgeLabel = 'Unavailable';
      badgeClass = 'bg-[var(--error-dim)] text-[var(--error)] border-[var(--error)]';
    } else {
      badgeLabel = 'Offline';
      badgeClass = 'bg-[var(--warning-dim)] text-[var(--warning)] border-[var(--warning)]';
    }
  }

  if (!isOpen) {
    return (
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 select-none">
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] text-xs font-semibold text-[var(--text-primary)] shadow-lg backdrop-blur-md transition-all group cursor-pointer"
        >
          <Sparkles size={14} className="text-[var(--accent)] group-hover:rotate-12 transition-transform" />
          <span>Generate Pipeline with AI</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border)]">
            Prompt
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 select-none">
      <div
        className="rounded-2xl border bg-[var(--bg-secondary)] border-[var(--border-bright)] shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles size={15} className="text-[var(--accent)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">AI Pipeline Generator</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${badgeClass}`}>
              {statusLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  <span>Checking…</span>
                </span>
              ) : (
                badgeLabel
              )}
            </span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            disabled={isGenerating}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe your workflow… (e.g. 'Go API to Kubernetes with SAST security scan')"
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-50"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleGenerate()}
              disabled={!prompt.trim() || isGenerating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !prompt.trim() || isGenerating
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed opacity-60'
                  : 'bg-[var(--accent)] text-white hover:brightness-110 cursor-pointer shadow-md'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <span>Build DAG</span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              disabled={isGenerating}
              className="px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Example chips */}
        <div className="px-4 py-2.5 bg-[var(--bg-primary)] flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] mr-1">Suggestions:</span>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={isGenerating}
              onClick={() => {
                setPrompt(ex);
                inputRef.current?.focus();
              }}
              className="text-[10px] rounded-md px-2 py-1 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer truncate max-w-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
