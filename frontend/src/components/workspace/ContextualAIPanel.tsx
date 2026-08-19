'use client';

import React, { useState } from 'react';
import { Node } from '@xyflow/react';
import { Sparkles, Zap, AlertTriangle, Send, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AIApplyDiffDrawer } from './AIApplyDiffDrawer';

// ─── Contextual AI content per node type ─────────────────────────────────────

interface AISuggestion {
  label: string;
  impact: string;
  action?: string;
}

interface AIContext {
  headline: string;
  subtext: string;
  badge?: { label: string; variant: 'risk' | 'ok' | 'info' };
  suggestions: AISuggestion[];
  fixAction?: { label: string };
}

function getContextForNode(node: Node | null): AIContext {
  if (!node) {
    return {
      headline: 'Pipeline Overview',
      subtext: 'Select a node for contextual AI analysis',
      suggestions: [
        { label: 'Parallelize SAST scan + Jest tests', impact: '−38s per run' },
        { label: 'Enable Docker BuildKit layer cache', impact: '−37% build time' },
        { label: 'Switch to npm ci --cache .npm', impact: '−18s per run' },
        { label: 'Add health-check step post-deploy', impact: 'Catch rollout failures' },
      ],
    };
  }

  switch (node.type) {
    case 'source':
      return {
        headline: 'Git Source Intelligence',
        subtext: 'Branch analysis & trigger optimization',
        badge: { label: '● Healthy', variant: 'ok' },
        suggestions: [
          { label: 'Add path filters to reduce trigger noise', impact: 'Fewer unnecessary runs' },
          { label: 'Enable shallow clone (--depth=1)', impact: '−0.8s clone time' },
          { label: 'Cache .git/objects between runs', impact: '−1.1s on warm runs' },
        ],
      };

    case 'build':
      return {
        headline: 'Docker Build Analysis',
        subtext: 'Image size 847 MB → target <200 MB',
        badge: { label: '⚠ Oversized Image', variant: 'risk' },
        suggestions: [
          { label: 'Switch to multi-stage build', impact: '−640 MB image size' },
          { label: 'Enable DOCKER_BUILDKIT=1', impact: '−37% build time' },
          { label: 'Add RUN --mount=type=cache for npm', impact: '−52s on cache hit' },
          { label: 'Switch base to node:20-alpine', impact: '−280 MB from base image' },
        ],
        fixAction: { label: 'Apply All Optimizations' },
      };

    case 'test':
      return {
        headline: 'Test Suite Analysis',
        subtext: '187 tests · 38.4s · 82% CPU',
        badge: { label: '● All Passing', variant: 'ok' },
        suggestions: [
          { label: 'Increase --maxWorkers from 4 → 8', impact: '−12s runtime' },
          { label: 'Enable Jest --cache between runs', impact: '−8s on warm cache' },
          { label: 'Split slow tests into parallel shards', impact: '−22s total' },
        ],
      };

    case 'security':
      return {
        headline: 'Security Scan Analysis',
        subtext: '0 HIGH/CRITICAL · Scan took 12.1s',
        badge: { label: '● Clean', variant: 'ok' },
        suggestions: [
          { label: 'Add SBOM generation (--format cyclonedx)', impact: 'Compliance artifact' },
          { label: 'Cache Trivy DB between runs', impact: '−9s per scan' },
          { label: 'Enable Secret Detection scan', impact: 'Catch leaked credentials' },
        ],
      };

    case 'deploy':
      return {
        headline: 'Deployment Risk Analysis',
        subtext: 'Production · 78% current traffic',
        badge: { label: '⚠ Risk Score 82%', variant: 'risk' },
        suggestions: [
          { label: 'Database migration detected in commit', impact: 'HIGH RISK — schema change' },
          { label: 'Recommended deploy window: 23:00 UTC', impact: 'Low-traffic period' },
          { label: 'Add canary rollout (10% → 50% → 100%)', impact: 'Reduce blast radius' },
          { label: 'Add pre-deploy readiness probe', impact: 'Catch ImagePullBackOff early' },
        ],
        fixAction: { label: 'Schedule for 23:00 UTC' },
      };

    case 'notification':
      return {
        headline: 'Notification Analysis',
        subtext: 'Slack #deployments · webhook v2',
        badge: { label: '● Connected', variant: 'ok' },
        suggestions: [
          { label: 'Add failure-only filter to reduce noise', impact: 'Fewer Slack interruptions' },
          { label: 'Include commit author in message', impact: 'Better accountability' },
          { label: 'Add PagerDuty for production failures', impact: 'On-call escalation' },
        ],
      };

    default:
      return {
        headline: 'AI Analysis',
        subtext: 'Select a node for context',
        suggestions: [],
      };
  }
}

// ─── Chat message type ────────────────────────────────────────────────────────
interface ChatMsg { role: 'user' | 'ai'; text: string }

interface ContextualAIPanelProps {
  selectedNode: Node | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ContextualAIPanel({ selectedNode }: ContextualAIPanelProps) {
  const ctx = getContextForNode(selectedNode);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);

  const [applyingFix, setApplyingFix] = useState(false);
  const [fixApplied, setFixApplied]   = useState(false);
  const [diffDrawerOpen, setDiffDrawerOpen] = useState(false);

  const sendChat = () => {
    if (!chatInput.trim() || thinking) return;
    const userMsg: ChatMsg = { role: 'user', text: chatInput.trim() };
    setChatMessages((m) => [...m, userMsg]);
    setChatInput('');
    setThinking(true);
    setTimeout(() => {
      const reply: ChatMsg = {
        role: 'ai',
        text: selectedNode
          ? `For the **${String(selectedNode.data?.label ?? selectedNode.type)}** step: I recommend reviewing the suggestion above. Would you like me to apply this automatically?`
          : `I analyzed your pipeline. The biggest win right now is parallelizing the SAST scan and Jest tests — they can run concurrently, saving ~38 seconds per run.`,
      };
      setChatMessages((m) => [...m, reply]);
      setThinking(false);
    }, 900);
  };

  const handleApplyFix = () => {
    setDiffDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      <AIApplyDiffDrawer
        open={diffDrawerOpen}
        onClose={() => setDiffDrawerOpen(false)}
        title={ctx.fixAction?.label ?? 'Apply Fix'}
        targetItem={selectedNode ? String(selectedNode.data?.label ?? selectedNode.type) : 'production/app-backend'}

        beforeContent={
          selectedNode?.type === 'deploy'
            ? 'DOCKER_HUB_TOKEN = "dckr_pat_exp20240114_old"'
            : 'DOCKER_BUILDKIT = 0\nCACHE_MOUNT = false'
        }
        afterContent={
          selectedNode?.type === 'deploy'
            ? 'DOCKER_HUB_TOKEN = "dckr_pat_auto_rotated_20240115_new"'
            : 'DOCKER_BUILDKIT = 1\nRUN --mount=type=cache,target=/root/.npm'
        }
        onFixComplete={() => {
          setFixApplied(true);
        }}
      />
      {/* Header */}
      <div className="h-10 px-3 flex items-center gap-2 border-b border-slate-800 shrink-0">
        <div className="p-1 rounded bg-blue-500/10">
          <Sparkles size={12} className="text-blue-400" />
        </div>
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">AI Copilot</span>
        {selectedNode && (
          <span className="ml-auto text-[10px] font-mono text-slate-500 truncate">
            {String(selectedNode.data?.label ?? selectedNode.type)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* Context headline */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">{ctx.headline}</span>
            {ctx.badge && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                ctx.badge.variant === 'risk'
                  ? 'text-rose-300 bg-rose-900/20 border border-rose-700/30'
                  : 'text-slate-300 bg-slate-800 border border-slate-700'
              }`}>
                {ctx.badge.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{ctx.subtext}</p>
        </div>

        {/* AI Suggestions */}
        {ctx.suggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={9} /> AI Suggestions
            </p>
            {ctx.suggestions.map((s, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors group cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <ChevronRight size={11} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-200 leading-snug">{s.label}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{s.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Primary action with 1-click execution feedback */}
        {ctx.fixAction && (
          <button
            onClick={handleApplyFix}
            disabled={applyingFix}
            className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              fixApplied
                ? 'bg-emerald-600 text-white'
                : applyingFix
                ? 'bg-blue-700 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {fixApplied ? (
              <>
                <CheckCircle2 size={13} />
                <span>Fix Applied & Verified!</span>
              </>
            ) : applyingFix ? (
              <>
                <span className="animate-spin text-sm">⚡</span>
                <span>Applying Fix via Backend Execution...</span>
              </>
            ) : (
              <>
                <Zap size={12} />
                <span>{ctx.fixAction.label}</span>
              </>
            )}
          </button>
        )}

        {/* Risk detail for deploy */}
        {selectedNode?.type === 'deploy' && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
              <AlertTriangle size={12} />
              HIGH RISK DEPLOYMENT
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Risk Score</span>
                <span className="text-rose-300 font-mono font-bold">82%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Traffic</span>
                <span className="font-mono">78%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Recommended Window</span>
                <span className="font-mono text-slate-200">23:00 UTC</span>
              </div>
            </div>
          </div>
        )}

        {/* Chat thread */}
        {chatMessages.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            {chatMessages.map((m, i) => (
              <div key={i} className={`text-[11px] leading-relaxed rounded-lg px-2.5 py-2 ${
                m.role === 'user'
                  ? 'bg-blue-600/20 text-blue-100 ml-4'
                  : 'bg-slate-800 text-slate-300 mr-4'
              }`}>
                {m.text}
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-1 px-2.5 py-2 bg-slate-800 rounded-lg mr-4">
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline chat input */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex gap-2 items-center bg-slate-950 border border-slate-700 focus-within:border-blue-500/60 rounded-lg px-3 py-2 transition-colors">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder="Ask AI about this step…"
            className="flex-1 bg-transparent text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <button onClick={sendChat} disabled={!chatInput.trim() || thinking} className="text-blue-400 hover:text-blue-300 disabled:opacity-30 transition-colors">
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
