'use client';

import React, { useState } from 'react';
import { X, Sparkles, Check, CheckCircle2, ArrowRight, ShieldCheck, Zap, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface AIApplyDiffDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  targetItem: string;
  beforeContent: string;
  afterContent: string;
  onFixComplete?: () => void;
}

export function AIApplyDiffDrawer({
  open,
  onClose,
  title,
  targetItem,
  beforeContent,
  afterContent,
  onFixComplete,
}: AIApplyDiffDrawerProps) {
  const [step, setStep] = useState<'preview' | 'executing' | 'completed'>('preview');
  const [logs, setLogs] = useState<string[]>([]);

  if (!open) return null;

  const handleConfirmAndExecute = () => {
    setStep('executing');
    setLogs(['▸ 14:45:00 · Preparing API execution payload...']);

    setTimeout(() => {
      setLogs((l) => [...l, '▸ 14:45:01 · Authenticating with OpsPilot Worker Agent (worker-us-east-1)...']);
    }, 400);

    setTimeout(() => {
      setLogs((l) => [...l, `▸ 14:45:02 · Applying modification to target: ${targetItem}`]);
    }, 900);

    setTimeout(() => {
      setLogs((l) => [...l, '✓ 14:45:03 · Execution successful — changes committed to state']);
      setStep('completed');
      if (onFixComplete) onFixComplete();
    }, 1500);
  };

  const handleReset = () => {
    setStep('preview');
    setLogs([]);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Sparkles size={14} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Transparent AI Apply</h3>
            <span className="text-[10px] font-mono text-slate-500">{targetItem}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-blue-300">
            <span>{title}</span>
            <Badge status="healthy">● Ready</Badge>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Review proposed changes below. No backend mutations occur until explicit confirmation.
          </p>
        </div>

        {/* Diff Preview Box */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Proposed Diff Preview</span>
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#020617] font-mono text-xs p-3 space-y-1.5">
            {/* Before */}
            <div className="flex items-start gap-2 text-rose-300 bg-rose-950/30 p-2 rounded border border-rose-900/40">
              <span className="text-rose-500 font-bold shrink-0">−</span>
              <pre className="whitespace-pre-wrap break-all">{beforeContent}</pre>
            </div>
            {/* After */}
            <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-900/40">
              <span className="text-emerald-500 font-bold shrink-0">+</span>
              <pre className="whitespace-pre-wrap break-all">{afterContent}</pre>
            </div>
          </div>
        </div>

        {/* Execution Log Step */}
        {(step === 'executing' || step === 'completed') && (
          <div className="space-y-1.5 animate-in fade-in duration-150">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Execution Console Log</span>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#020617] font-mono text-[11px] p-3 space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={log.startsWith('✓') ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {log}
                </div>
              ))}
              {step === 'executing' && (
                <div className="flex items-center gap-1.5 text-blue-400 pt-1">
                  <Loader2 size={11} className="animate-spin" />
                  <span>Executing API payload...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verified Status */}
        {step === 'completed' && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>Fix Successfully Applied & Verified!</span>
            </div>
            <button onClick={handleReset} className="text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1">
              <RotateCcw size={10} /> Rollback
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
        {step === 'preview' && (
          <Button variant="primary" size="sm" onClick={handleConfirmAndExecute} className="gap-1.5 font-bold">
            <Zap size={13} />
            <span>Confirm & Execute Fix</span>
          </Button>
        )}
        {step === 'completed' && (
          <Button variant="secondary" size="sm" onClick={onClose} className="gap-1.5 font-bold">
            <Check size={13} className="text-emerald-400" />
            <span>Done</span>
          </Button>
        )}
      </div>
    </div>
  );
}
