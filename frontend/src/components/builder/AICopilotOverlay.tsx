'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { fetchAiStatus, AiStatusResponse } from '@/lib/apiClient';

interface AICopilotOverlayProps {
  onAutoAddStep?: (stepType: string, label: string) => void;
  aiStatus?: AiStatusResponse | null;
}

export function AICopilotOverlay({ onAutoAddStep, aiStatus: initialStatus }: AICopilotOverlayProps) {
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<AiStatusResponse | null>(initialStatus ?? null);
  const [isLoading, setIsLoading] = useState(!initialStatus);
  const [errorState, setErrorState] = useState<'none' | 'unconfigured' | 'error' | 'unauthenticated'>('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialStatus) {
      setStatus(initialStatus);
      setIsLoading(false);
      if (initialStatus.status === 'connected' && initialStatus.configured) {
        setErrorState('none');
      } else if (!initialStatus.configured) {
        setErrorState('unconfigured');
      } else {
        setErrorState('error');
      }
      return;
    }

    let isMounted = true;
    async function loadAiStatus() {
      setIsLoading(true);
      setErrorState('none');
      setErrorMessage(null);
      try {
        const res = await fetchAiStatus();
        if (!isMounted) return;
        const data = res?.data;
        setStatus(data ?? null);
        if (data?.status === 'connected' && data?.configured) {
          setErrorState('none');
        } else if (data && !data.configured) {
          setErrorState('unconfigured');
        } else {
          setErrorState('error');
          setErrorMessage('AI service is currently unavailable.');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const errorObj = err as { message?: string };
        const msg = errorObj?.message || '';
        if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
          setErrorState('unauthenticated');
          setErrorMessage('Sign in required to enable AI Copilot.');
        } else {
          setErrorState('error');
          setErrorMessage(msg || 'AI backend is unreachable.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAiStatus();
    return () => {
      isMounted = false;
    };
  }, [initialStatus]);

  if (dismissed) return null;

  // Auto-Insert capability check: strictly driven by real backend capability response
  const supportsAutoInsert = Boolean(
    !isLoading &&
    errorState === 'none' &&
    status?.status === 'connected' &&
    (status?.capabilities?.includes('AUTO_INSERT') || status?.capabilities?.includes('STEP_RECOMMENDATION'))
  );

  // Dynamic presentation based on actual backend response
  let badgeLabel = 'Checking…';
  let badgeStyle = {
    background: 'var(--bg-tertiary)',
    borderColor: 'var(--border)',
    color: 'var(--text-muted)',
  };
  let description = 'Connecting to OpsPilot AI orchestration service…';

  if (!isLoading) {
    if (errorState === 'unauthenticated') {
      badgeLabel = 'Auth Required';
      badgeStyle = {
        background: 'var(--warning-dim)',
        borderColor: 'var(--warning)',
        color: 'var(--warning)',
      };
      description = 'Authentication required. Sign in with a valid session to access AI Copilot.';
    } else if (errorState === 'unconfigured') {
      badgeLabel = 'Not Configured';
      badgeStyle = {
        background: 'var(--warning-dim)',
        borderColor: 'var(--warning)',
        color: 'var(--warning)',
      };
      description = 'AI service is not configured. Configure GEMINI_API_KEY in backend settings.';
    } else if (errorState === 'error') {
      badgeLabel = 'Unavailable';
      badgeStyle = {
        background: 'var(--error-dim)',
        borderColor: 'var(--error)',
        color: 'var(--error)',
      };
      description = errorMessage || 'AI backend is unreachable or encountering errors.';
    } else if (status?.status === 'connected') {
      badgeLabel = status.provider ? `${status.provider}` : 'Available';
      badgeStyle = {
        background: 'var(--success-dim)',
        borderColor: 'var(--success)',
        color: 'var(--success)',
      };
      description = `Real-time DAG analysis active (${status.provider} • ${status.model}). Monitoring pipeline flow.`;
    }
  }

  const handleAutoInsert = () => {
    if (!supportsAutoInsert || !onAutoAddStep) return;
    onAutoAddStep('security', 'SAST Security Scan');
  };

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
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
          ) : (
            <Sparkles size={14} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>AI Pipeline Copilot</span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1"
              style={badgeStyle}
            >
              {isLoading && <Loader2 size={9} className="animate-spin" />}
              {badgeLabel}
            </span>
          </div>
          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          disabled={!supportsAutoInsert}
          onClick={handleAutoInsert}
          title={
            supportsAutoInsert
              ? 'Auto-insert recommended pipeline stage'
              : 'Auto-Insert capability not enabled by backend AI provider'
          }
          className={`gap-1 text-[11px] ${supportsAutoInsert ? 'cursor-pointer hover:bg-[var(--accent)] hover:text-white' : 'cursor-not-allowed opacity-50'}`}
        >
          <Plus size={12} />
          <span>Auto-Insert</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
