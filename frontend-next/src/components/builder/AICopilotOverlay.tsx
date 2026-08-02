'use client';

import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Zap, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';

interface AICopilotOverlayProps {
  onAutoAddStep?: (stepType: string, label: string) => void;
}

export function AICopilotOverlay({ onAutoAddStep }: AICopilotOverlayProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-2xl text-slate-100 flex items-center justify-between gap-4 select-none animate-in slide-in-from-top-4 duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
          <Sparkles size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-100">AI Pipeline Copilot</span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              Confidence: 96%
            </span>
          </div>
          <p className="text-[11px] text-slate-300 truncate mt-0.5">
            Deployment step detected without prior SAST security scan. Insert Trivy vulnerability check?
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onAutoAddStep?.('security', 'Trivy SAST Scan')}
          className="gap-1 text-[11px]"
        >
          <Plus size={12} />
          <span>Auto-Insert</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
