'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { DeveloperShell } from '../layout/DeveloperShell';
import { Badge } from '../ui/badge';
import {
  GitBranch, Box, CheckSquare, ShieldCheck, Rocket, Bell,
  Clock, Cpu, MemoryStick, Rewind, Play, Pause, ChevronRight,
  Sparkles, RefreshCw, AlertCircle, Download, RotateCcw,
} from 'lucide-react';

const XTermPanel = dynamic(
  () => import('../ui/XTermPanel').then((m) => ({ default: m.XTermPanel })),
  { ssr: false },
);

// ─── Types ───────────────────────────────────────────────────────────────────
type StepStatus = 'success' | 'failed' | 'running' | 'queued' | 'skipped';

interface ExecutionStep {
  id: string;
  name: string;
  type: 'source' | 'test' | 'security' | 'build' | 'deploy' | 'notification';
  status: StepStatus;
  duration: string;
  cpu: string;
  mem: string;
  exitCode: number | null;
  startedAt: string;
  logs: string[];
}

interface LiveRunData {
  runId: string;
  repoName: string;
  commitSha: string;
  branch: string;
  status: string;
  totalDuration: string;
  startTime: string;
  endTime: string;
}

// ─── Default Pipeline Stages ──────────────────────────────────────────────────
const DEFAULT_STAGE_STEPS: ExecutionStep[] = [
  {
    id: 's1', name: 'Source Checkout', type: 'source', status: 'queued',
    duration: '—', cpu: '—', mem: '—', exitCode: null, startedAt: '—',
    logs: ['[INFO] Initializing workspace container...', '[INFO] Preparing source checkout...'],
  },
  {
    id: 's2', name: 'Build & Compile', type: 'build', status: 'queued',
    duration: '—', cpu: '—', mem: '—', exitCode: null, startedAt: '—',
    logs: ['[INFO] Waiting for build execution...'],
  },
  {
    id: 's3', name: 'Automated Tests', type: 'test', status: 'queued',
    duration: '—', cpu: '—', mem: '—', exitCode: null, startedAt: '—',
    logs: ['[INFO] Test suite waiting for execution...'],
  },
  {
    id: 's4', name: 'Security Audit', type: 'security', status: 'queued',
    duration: '—', cpu: '—', mem: '—', exitCode: null, startedAt: '—',
    logs: ['[INFO] Security scanner queued...'],
  },
  {
    id: 's5', name: 'Deployment', type: 'deploy', status: 'queued',
    duration: '—', cpu: '—', mem: '—', exitCode: null, startedAt: '—',
    logs: ['[INFO] Deployment step waiting for upstream completion...'],
  },
];

const STEP_TIME_PCTS = [0, 20, 40, 60, 80, 100];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stepIcon(type: ExecutionStep['type']) {
  const cls = 'w-4 h-4 shrink-0';
  switch (type) {
    case 'source':       return <GitBranch className={cls} />;
    case 'test':         return <CheckSquare className={cls} />;
    case 'security':     return <ShieldCheck className={cls} />;
    case 'build':        return <Box className={cls} />;
    case 'deploy':       return <Rocket className={cls} />;
    case 'notification': return <Bell className={cls} />;
  }
}

function statusLabel(s: StepStatus) {
  if (s === 'success') return <span className="text-[10px] font-mono text-emerald-400">● Done</span>;
  if (s === 'failed')  return <span className="text-[10px] font-mono text-rose-400">✕ Failed</span>;
  if (s === 'running') return <span className="text-[10px] font-mono text-blue-300 animate-pulse">◌ Running</span>;
  if (s === 'skipped') return <span className="text-[10px] font-mono text-slate-500">— Skipped</span>;
  return null;
}

function statusBadgeColor(status: string) {
  if (status === 'FAILED' || status === 'failed') return 'failed';
  if (status === 'SUCCESS' || status === 'success') return 'success';
  if (status === 'RUNNING' || status === 'running') return 'running';
  return 'queued';
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ExecutionWorkspaceProps {
  runId?: string;
}

export function ExecutionWorkspace({ runId }: ExecutionWorkspaceProps) {
  const [sliderPct, setSliderPct] = useState(100);
  const [selectedStepId, setSelectedStepId] = useState<string>('s5');
  const [isReplaying, setIsReplaying] = useState(false);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);

  const [liveRun, setLiveRun] = useState<LiveRunData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch live run logs from backend API
  const fetchLiveLogs = useCallback(async () => {
    if (!runId) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('opspilot_token');
      const orgId = localStorage.getItem('opspilot_org_id');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (orgId) headers['x-organization-id'] = orgId;

      const res = await fetch(`/v1/pipeline-runs/${runId}/logs`, {
        headers,
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const logs = json.data.map(
            (l: { level: string; timestamp: string; message: string }) =>
              `[${l.level?.toUpperCase() || 'INFO'}] ${l.timestamp} · ${l.message}`
          );
          setLiveLogs(logs);
          // Update the selected step's logs with live data
          setSteps((prev) =>
            prev.map((s) =>
              s.id === selectedStepId ? { ...s, logs } : s
            )
          );
        }
      }

      // Also fetch run metadata from pipeline-runs list
      const runsRes = await fetch(`/v1/pipeline-runs`, { headers, cache: 'no-store' });
      if (runsRes.ok) {
        const runsJson = await runsRes.json();
        const matchedRun = Array.isArray(runsJson.data)
          ? runsJson.data.find((r: { id: string }) => r.id === runId || String(r.id).includes(runId))
          : null;
        if (matchedRun) {
          setLiveRun({
            runId: matchedRun.id,
            repoName: matchedRun.repositoryUrl || 'Repository',
            commitSha: matchedRun.commitSha?.slice(0, 7) || 'HEAD',
            branch: matchedRun.branch || 'main',
            status: matchedRun.status || 'UNKNOWN',
            totalDuration: matchedRun.duration ? `${matchedRun.duration}s` : '—',
            startTime: matchedRun.startedAt ? new Date(matchedRun.startedAt).toLocaleTimeString() : '—',
            endTime: matchedRun.finishedAt ? new Date(matchedRun.finishedAt).toLocaleTimeString() : '—',
          });
        }
      }
    } catch {
      // Graceful error state
    } finally {
      setIsLoading(false);
    }
  }, [runId, selectedStepId]);

  useEffect(() => {
    fetchLiveLogs();
  }, [runId, fetchLiveLogs]);

  // Time machine replay
  useEffect(() => {
    if (isReplaying) {
      setSliderPct(0);
      replayRef.current = setInterval(() => {
        setSliderPct((p) => {
          if (p >= 100) {
            setIsReplaying(false);
            if (replayRef.current) clearInterval(replayRef.current);
            return 100;
          }
          return p + 1;
        });
      }, 60);
    }
    return () => { if (replayRef.current) clearInterval(replayRef.current); };
  }, [isReplaying]);

  const activeSteps = steps.length > 0 ? steps : DEFAULT_STAGE_STEPS;
  const visibleStepCount = Math.max(1, STEP_TIME_PCTS.filter((t) => t <= sliderPct).length);
  const visibleSteps = activeSteps.slice(0, visibleStepCount);
  const selectedStep = activeSteps.find((s) => s.id === selectedStepId) ?? activeSteps[0];

  const runStatus = liveRun?.status || 'QUEUED';
  const displayRunId = runId || 'Latest';
  const repoDisplay = liveRun?.repoName || 'Workspace';

  const commitSha = liveRun?.commitSha || 'HEAD';
  const startTime = liveRun?.startTime || '—';
  const endTime = liveRun?.endTime || '—';

  const terminalLogs = selectedStep && selectedStep.id === selectedStepId && liveLogs.length > 0
    ? liveLogs
    : (selectedStep?.logs ?? ['[INFO] No log output recorded yet.']);

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

        {/* TOP BAR */}
        <div className="h-14 px-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">Execution Workspace</h1>
            <Badge status={statusBadgeColor(runStatus)}>
              {runStatus === 'FAILED' || runStatus === 'failed' ? `✕ Run #${displayRunId} Failed`
                : runStatus === 'SUCCESS' || runStatus === 'success' ? `✓ Run #${displayRunId} Passed`
                : runStatus === 'RUNNING' ? `◌ Run #${displayRunId} Running`
                : `Run #${displayRunId}`}
            </Badge>
            <span className="text-xs font-mono text-slate-400">{repoDisplay} @ {commitSha}</span>
            {liveRun && (
              <span className="text-[10px] font-mono text-blue-400 border border-blue-800/40 bg-blue-900/20 px-2 py-0.5 rounded-full">
                Live Data ●
              </span>
            )}
            {isLoading && (
              <RefreshCw size={12} className="text-slate-500 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <button
              onClick={fetchLiveLogs}
              className="flex items-center gap-1 hover:text-slate-200 transition-colors"
              title="Refresh live data"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
            <span className="text-slate-700">•</span>
            <Clock size={13} />
            <span className="font-mono">Total: {liveRun?.totalDuration || '3m 06s'}</span>
            <span className="px-1 text-slate-700">•</span>
            <span className="font-mono">{startTime} → {endTime}</span>
          </div>
        </div>

        {/* MAIN THREE-PANEL WORKSPACE */}
        <div className="flex-1 flex gap-3 min-h-0">

          {/* LEFT — STEP TIMELINE */}
          <aside className="w-60 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0">
            <div className="h-10 px-4 flex items-center border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Pipeline Steps</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {steps.map((step, i) => {
                const visible = i < visibleSteps.length;
                const active = step.id === selectedStepId;
                return (
                  <button
                    key={step.id}
                    onClick={() => setSelectedStepId(step.id)}
                    disabled={!visible}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-2.5 transition-all text-xs ${
                      active ? 'bg-slate-800 border border-slate-700' : visible ? 'hover:bg-slate-800/60' : 'opacity-25'
                    }`}
                  >
                    <span className={
                      step.status === 'failed' ? 'text-rose-400'
                        : step.status === 'skipped' ? 'text-slate-500'
                        : step.status === 'running' ? 'text-blue-400'
                        : 'text-slate-300'
                    }>
                      {stepIcon(step.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-200 truncate">{step.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {statusLabel(step.status)}
                        {step.status !== 'skipped' && (
                          <span className="text-[10px] font-mono text-slate-500 ml-1">{step.duration}</span>
                        )}
                      </div>
                    </div>
                    {active && <ChevronRight size={12} className="text-slate-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* CENTER — XTERM TERMINAL */}
          <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-w-0">
            {/* Step header */}
            <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className={selectedStep.status === 'failed' ? 'text-rose-400' : selectedStep.status === 'running' ? 'text-blue-400' : 'text-slate-300'}>
                  {stepIcon(selectedStep.type)}
                </span>
                <span className="text-sm font-bold text-slate-100">{selectedStep.name}</span>
                {statusLabel(selectedStep.status)}
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
                {selectedStep.cpu !== '—' && (
                  <span className="flex items-center gap-1"><Cpu size={11} /> {selectedStep.cpu}</span>
                )}
                {selectedStep.mem !== '—' && (
                  <span className="flex items-center gap-1"><MemoryStick size={11} /> {selectedStep.mem}</span>
                )}
                <span className="flex items-center gap-1"><Clock size={11} /> {selectedStep.duration}</span>
                {selectedStep.exitCode !== null && (
                  <span className={`font-bold ${selectedStep.exitCode === 0 ? 'text-slate-300' : 'text-rose-400'}`}>
                    Exit: {selectedStep.exitCode}
                  </span>
                )}
              </div>
            </div>

            {/* xterm.js terminal */}
            <div className="flex-1 min-h-0 bg-[#020617] relative">
              <XTermPanel key={selectedStep.id + terminalLogs.length} lines={terminalLogs} stream={true} />
            </div>

            {/* AI Root Cause — only for failed steps */}
            {selectedStep.status === 'failed' && (
              <div className="shrink-0 mx-3 mb-3 mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-start gap-2.5">
                <Sparkles size={13} className="shrink-0 mt-0.5 text-blue-400" />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="font-bold text-blue-300 flex items-center gap-2">
                    Step Diagnostics
                    <AlertCircle size={11} className="text-rose-400" />
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Step <code className="text-blue-300 bg-blue-900/20 px-1 rounded">{selectedStep.name}</code> terminated with exit code <strong className="text-rose-400 font-mono">{selectedStep.exitCode ?? 1}</strong>.
                    Review the console output above to inspect the exact failure reason or trigger a retry.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={fetchLiveLogs}
                      className="flex items-center gap-1 text-[10px] text-blue-300 hover:text-blue-200 border border-blue-800/40 bg-blue-900/20 px-2 py-1 rounded-lg transition-colors"
                    >
                      <RotateCcw size={10} /> Refresh Step Logs
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — TIME MACHINE */}
          <aside className="w-60 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0">
            <div className="h-10 px-4 flex items-center border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Rewind size={12} /> Time Machine
              </span>
            </div>
            <div className="flex-1 p-4 space-y-4 flex flex-col">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>{startTime}</span>
                  <span>{endTime}</span>
                </div>
                <input
                  type="range" min={0} max={100} value={sliderPct}
                  onChange={(e) => { setSliderPct(Number(e.target.value)); setIsReplaying(false); }}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="text-center text-[10px] font-mono text-slate-400">
                  {sliderPct < 2 ? startTime
                    : sliderPct < 42 ? '14:31:01'
                    : sliderPct < 46 ? '14:31:40'
                    : sliderPct < 58 ? '14:31:52'
                    : sliderPct < 95 ? '14:34:10'
                    : '14:34:25'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setSliderPct(0); setIsReplaying(false); }}
                  className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <Rewind size={12} /> Reset
                </button>
                <button
                  onClick={() => setIsReplaying(!isReplaying)}
                  className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors"
                >
                  {isReplaying ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Replay</>}
                </button>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Execution Timeline</p>
                {steps.map((step, i) => {
                  const visible = i < visibleSteps.length;
                  return (
                    <button
                      key={step.id}
                      onClick={() => { if (visible) setSelectedStepId(step.id); }}
                      disabled={!visible}
                      className={`w-full flex items-center gap-2 text-[10px] font-mono transition-all hover:bg-slate-800/40 rounded p-1 ${visible ? 'opacity-100' : 'opacity-20'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        step.status === 'failed' ? 'bg-rose-500'
                          : step.status === 'running' ? 'bg-blue-400 animate-pulse'
                          : step.status === 'skipped' ? 'bg-slate-600'
                          : 'bg-emerald-400'
                      }`} />
                      <span className="text-slate-500 w-14 shrink-0">{step.startedAt}</span>
                      <span className="text-slate-300 truncate">{step.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DeveloperShell>
  );
}
