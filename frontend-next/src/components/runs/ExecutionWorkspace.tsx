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

// ─── Static fallback data ─────────────────────────────────────────────────────
const FALLBACK_STEPS: ExecutionStep[] = [
  {
    id: 's1', name: 'Git Repository', type: 'source', status: 'success',
    duration: '1.2s', cpu: '0.1%', mem: '12 MB', exitCode: 0, startedAt: '14:31:00',
    logs: [
      'Initialized git repository clone...',
      'Cloning StockFlow/backend @ sha: a4f3d19',
      'Branch: main → HEAD detached at a4f3d19',
      'Files: 2,841 objects received (12.3 MB)',
      '✓ Clone complete in 1.2s',
    ],
  },
  {
    id: 's2', name: 'Jest Integration Tests', type: 'test', status: 'success',
    duration: '38.4s', cpu: '82%', mem: '248 MB', exitCode: 0, startedAt: '14:31:01',
    logs: [
      'npm test -- --ci --maxWorkers=4 --forceExit',
      'PASS src/__tests__/auth.test.ts (4.2s)',
      'PASS src/__tests__/pipelines.test.ts (7.8s)',
      'PASS src/__tests__/deployments.test.ts (11.1s)',
      'PASS src/__tests__/workers.test.ts (15.3s)',
      'Test Suites: 24 passed, 0 failed',
      'Tests:       187 passed, 0 failed, 0 skipped',
      '✓ Time: 38.4s — All tests passed',
    ],
  },
  {
    id: 's3', name: 'Trivy SAST Scan', type: 'security', status: 'success',
    duration: '12.1s', cpu: '34%', mem: '94 MB', exitCode: 0, startedAt: '14:31:40',
    logs: [
      'trivy image --severity HIGH,CRITICAL --exit-code 0 node:20-alpine',
      'Total: 0 (HIGH: 0, CRITICAL: 0)',
      '✓ No HIGH or CRITICAL vulnerabilities found',
    ],
  },
  {
    id: 's4', name: 'Docker Container Build', type: 'build', status: 'success',
    duration: '2m 18s', cpu: '91%', mem: '512 MB', exitCode: 0, startedAt: '14:31:52',
    logs: [
      'docker buildx build --platform linux/amd64 --push -t stockflow/backend:a4f3d19 .',
      'Step 1/8 : FROM node:20-alpine',
      'Step 8/8 : CMD ["node", "dist/main.js"]',
      '✓ Successfully built sha256:4b7e9f2a',
      '✓ Pushed to registry in 2m 18s',
    ],
  },
  {
    id: 's5', name: 'Kubernetes Rollout', type: 'deploy', status: 'failed',
    duration: '14.8s', cpu: '8%', mem: '32 MB', exitCode: 1, startedAt: '14:34:10',
    logs: [
      'kubectl apply -f k8s/deployment.yaml --namespace=production',
      'deployment.apps/backend configured',
      'Waiting for deployment "backend" rollout to finish...',
      'Warning  Failed    14s   kubelet  Error: ImagePullBackOff',
      'Error from server: deployment failed to roll out within timeout',
      'Error: Rollout failed. Exit code: 1',
    ],
  },
  {
    id: 's6', name: 'Slack Webhook', type: 'notification', status: 'skipped',
    duration: '—', cpu: '—', mem: '—', exitCode: null, startedAt: '14:34:25',
    logs: ['Skipped: upstream step "Kubernetes Rollout" failed with exit code 1'],
  },
];

const STEP_TIME_PCTS = [0, 2, 42, 46, 58, 95, 100];

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
  const [steps, setSteps] = useState<ExecutionStep[]>(FALLBACK_STEPS);
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
            repoName: matchedRun.repositoryUrl || 'stockflow/backend',
            commitSha: matchedRun.commitSha?.slice(0, 7) || 'a4f3d19',
            branch: matchedRun.branch || 'main',
            status: matchedRun.status || 'UNKNOWN',
            totalDuration: '3m 06s',
            startTime: matchedRun.startedAt ? new Date(matchedRun.startedAt).toLocaleTimeString() : '14:31:00',
            endTime: matchedRun.finishedAt ? new Date(matchedRun.finishedAt).toLocaleTimeString() : '14:34:06',
          });
        }
      }
    } catch {
      // Keep fallback state
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

  const visibleStepCount = STEP_TIME_PCTS.filter((t) => t <= sliderPct).length - 1;
  const visibleSteps = steps.slice(0, visibleStepCount);
  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? steps[4];

  const runStatus = liveRun?.status || 'FAILED';
  const displayRunId = runId || '47';
  const repoDisplay = liveRun?.repoName || 'StockFlow/backend';
  const commitSha = liveRun?.commitSha || 'a4f3d19';
  const startTime = liveRun?.startTime || '14:31:00';
  const endTime = liveRun?.endTime || '14:34:06';

  const terminalLogs = selectedStep.id === selectedStepId && liveLogs.length > 0
    ? liveLogs
    : selectedStep.logs;

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
                    AI Root Cause Analysis
                    <AlertCircle size={11} className="text-rose-400" />
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    <code className="text-blue-300 bg-blue-900/20 px-1 rounded">ImagePullBackOff</code> — Docker Hub registry authentication expired.
                    Rotate the <code className="text-blue-300 bg-blue-900/20 px-1 rounded">DOCKER_HUB_TOKEN</code> secret in Settings → Secrets and re-trigger the run.
                    Estimated fix time: <strong className="text-slate-200">3 minutes</strong>.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button className="flex items-center gap-1 text-[10px] text-blue-300 hover:text-blue-200 border border-blue-800/40 bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                      <RotateCcw size={10} /> Rollback Deployment
                    </button>
                    <button className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-800/40 px-2 py-1 rounded-lg transition-colors">
                      <Download size={10} /> Download Logs
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
