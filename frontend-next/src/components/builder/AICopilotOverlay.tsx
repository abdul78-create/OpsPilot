'use client';

import React, { useState } from 'react';
import { Sparkles, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';

interface AICopilotOverlayProps {
  onAutoAddStep?: (stepType: string, label: string) => void;
}

export function AICopilotOverlay({ onAutoAddStep }: AICopilotOverlayProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl p-3 rounded-xl border backdrop-blur-md shadow-lg flex items-center justify-between gap-4 select-none animate-slide-up"
      style={{
        background: 'var(--bg-overlay)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="p-1.5 rounded-lg border shrink-0"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border)',
            color: 'var(--accent)',
          }}
        >
          <Sparkles size={14} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>AI Pipeline Copilot</span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              Confidence: 96%
            </span>
          </div>
          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Deployment step detected without prior SAST security scan. Insert Trivy vulnerability check?
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            onAutoAddStep?.('security', 'Trivy SAST Scan');
            setDismissed(true);
          }}
          className="gap-1 text-[11px]"
        >
          <Plus size={12} />
          <span>Auto-Insert</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
