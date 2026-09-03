'use client';

import React, { useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface GeneratedPipeline {
  nodes: Node[];
  edges: Edge[];
}

interface AIAutoBuilderProps {
  onGenerate: (pipeline: GeneratedPipeline) => void;
}

import { useToast } from '@/components/ui/Toast';

// ─── Component ────────────────────────────────────────────────────────────────
export function AIAutoBuilder({ onGenerate }: AIAutoBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    toast({
      kind: 'warning',
      title: 'AI Builder Unavailable',
      message: 'The AI generation backend is not currently configured or reachable.',
    });
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
    'Terraform AWS infrastructure pipeline',
  ];

  if (!isOpen) {
    return (
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 select-none">
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] text-xs font-semibold text-[var(--text-primary)] shadow-lg backdrop-blur-md transition-all group"
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
            <Sparkles size={15} className="text-[var(--text-muted)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">AI Pipeline Generator</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--warning-dim)] text-[var(--warning)] border border-[var(--warning)]">
              Unavailable
            </span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe your workflow… (e.g. 'Go API to Kubernetes with SAST security scan')"
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-50"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:opacity-90 transition-all cursor-not-allowed"
            >
              Build DAG <ArrowRight size={12} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
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
              disabled
              className="text-[10px] rounded-md px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed truncate max-w-xs"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
