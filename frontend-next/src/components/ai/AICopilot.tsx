'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DeveloperShell } from '../layout/DeveloperShell';
import { Badge } from '../ui/badge';
import { Sparkles, Send, User, Zap, AlertTriangle, CheckCircle2, Clock, ChevronRight, Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  card?: AICopilotCard;
  timestamp: string;
}

interface AICopilotCard {
  type: 'failure' | 'optimization' | 'suggestion';
  title: string;
  sections: { label: string; value: string; code?: boolean }[];
  action?: { label: string; variant: 'primary' | 'secondary' };
}

// ─── Pre-built AI response library ────────────────────────────────────────────
const AI_RESPONSES: Record<string, { content: string; card: AICopilotCard }> = {
  'why did production fail': {
    content: 'I found the root cause for **Deployment Run #47**. Here\'s a full analysis:',
    card: {
      type: 'failure',
      title: '✕ Deployment #47 — Root Cause Analysis',
      sections: [
        { label: 'Failed Step',    value: 'Kubernetes Rollout → prod-us-east-1' },
        { label: 'Error',          value: 'ImagePullBackOff — registry authentication expired', code: true },
        { label: 'Root Cause',     value: 'The DOCKER_HUB_TOKEN secret expired on 2024-01-14. Kubernetes cannot pull acme/backend:a4f3d19 from Docker Hub.' },
        { label: 'Suggested Fix',  value: 'Rotate DOCKER_HUB_TOKEN in Settings → Secrets → Docker Hub Integration', code: true },
        { label: 'Estimated Time', value: '~3 minutes' },
      ],
      action: { label: '⚡ Rotate Secret Automatically', variant: 'primary' },
    },
  },
  'optimize my pipeline': {
    content: 'I analyzed your pipeline topology and found **3 optimization opportunities**:',
    card: {
      type: 'optimization',
      title: '⚡ Pipeline Optimization Report',
      sections: [
        { label: 'Optimization 1', value: 'Enable Docker BuildKit layer caching → estimated -37% build time (2m 18s → 1m 26s)' },
        { label: 'Optimization 2', value: 'Parallelize Trivy SAST scan and Jest tests → they can run concurrently, saving ~38s' },
        { label: 'Optimization 3', value: 'Use npm ci --cache .npm instead of cold install → saves ~18s on cache hits' },
        { label: 'Total Savings',  value: '~1m 33s per run (49% faster)' },
      ],
      action: { label: '✓ Apply All Optimizations', variant: 'primary' },
    },
  },
  'add security scanning': {
    content: 'I can insert a **Trivy SAST security scan** step into your pipeline. Here\'s what it will do:',
    card: {
      type: 'suggestion',
      title: '✨ Add Trivy SAST Security Scan',
      sections: [
        { label: 'Position',  value: 'After Docker Build, before Kubernetes Deployment' },
        { label: 'Scanner',   value: 'Trivy v0.49 — CVE database updated daily', code: true },
        { label: 'Severity',  value: 'Block on: HIGH, CRITICAL. Warn on: MEDIUM' },
        { label: 'Est. Time', value: '+12s per run' },
      ],
      action: { label: '+ Insert Trivy Step into Pipeline', variant: 'primary' },
    },
  },
  'what is blocking deploy': {
    content: 'Let me check your current deployment status across all environments:',
    card: {
      type: 'failure',
      title: '◌ Deployment Status — acme-corp/backend-api',
      sections: [
        { label: 'Production (us-east-1)', value: '✕ Blocked — ImagePullBackOff since 14:34:10' },
        { label: 'Staging (us-east-1)',    value: '● Healthy — Deploy #46 succeeded 2h ago' },
        { label: 'Preview (PR #231)',      value: '● Healthy — Deploy #45 succeeded 4h ago' },
        { label: 'Blocker',               value: 'Rotate DOCKER_HUB_TOKEN to unblock production' },
      ],
      action: { label: 'View Run #47 Details', variant: 'secondary' },
    },
  },
};

function matchResponse(input: string) {
  const lower = input.toLowerCase();
  for (const [key, value] of Object.entries(AI_RESPONSES)) {
    if (lower.includes(key.split(' ')[0]) && lower.includes(key.split(' ').slice(-1)[0])) {
      return value;
    }
    if (lower.includes('fail') || lower.includes('broke') || lower.includes('error')) {
      return AI_RESPONSES['why did production fail'];
    }
    if (lower.includes('optim') || lower.includes('faster') || lower.includes('speed')) {
      return AI_RESPONSES['optimize my pipeline'];
    }
    if (lower.includes('security') || lower.includes('scan') || lower.includes('trivy')) {
      return AI_RESPONSES['add security scanning'];
    }
    if (lower.includes('block') || lower.includes('deploy') || lower.includes('status')) {
      return AI_RESPONSES['what is blocking deploy'];
    }
  }
  return null;
}

function CardSection({ card }: { card: AICopilotCard }) {
  const icon = card.type === 'failure' ? <AlertTriangle size={14} className="text-rose-400" /> :
               card.type === 'optimization' ? <Zap size={14} className="text-amber-400" /> :
               <CheckCircle2 size={14} className="text-blue-400" />;

  return (
    <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold text-slate-100">{card.title}</span>
      </div>
      <div className="p-4 space-y-3">
        {card.sections.map((s) => (
          <div key={s.label} className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</span>
            {s.code ? (
              <code className="block text-xs text-blue-300 bg-blue-900/20 rounded px-2 py-1 font-mono">{s.value}</code>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">{s.value}</p>
            )}
          </div>
        ))}
        {card.action && (
          <button className={`mt-2 w-full py-2 rounded-lg text-xs font-bold transition-colors ${
            card.action.variant === 'primary'
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
          }`}>
            {card.action.label}
          </button>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Why did production fail?',
  'Optimize my pipeline',
  'What is blocking deploy?',
  'Add security scanning',
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'ai',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content: "I'm your AI DevOps Copilot. I can diagnose failures, optimize pipelines, explain deployments, and suggest fixes. What would you like to know?",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function AICopilot() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = (text: string) => {
    if (!text.trim() || thinking) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      const match = matchResponse(text);
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: match?.content ?? "I've analyzed your workspace. Could you be more specific? Try asking about a deployment failure, pipeline optimization, or a specific run.",
        card: match?.card,
      };
      setMessages((m) => [...m, aiMsg]);
      setThinking(false);
    }, 1200 + Math.random() * 600);
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

        {/* TOP BAR */}
        <div className="h-14 px-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Sparkles size={14} className="text-blue-400" />
            </div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">AI DevOps Copilot</h1>
            <Badge status="healthy">● Online</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">Context: acme-corp/backend-api</span>
            <span>•</span>
            <span className="font-mono">Run #47 loaded</span>
          </div>
        </div>

        {/* CHAT AREA + SIDEBAR */}
        <div className="flex-1 flex gap-3 min-h-0">

          {/* MAIN CHAT */}
          <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-w-0">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                    msg.role === 'ai'
                      ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                      : 'bg-slate-700 border border-slate-600 text-slate-300'
                  }`}>
                    {msg.role === 'ai' ? <Bot size={14} /> : <User size={14} />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.card && <CardSection card={msg.card} />}
                    <span className="text-[10px] text-slate-600 font-mono px-1">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {thinking && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-blue-500/20 border border-blue-500/30 text-blue-400">
                    <Bot size={14} />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestion chips */}
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 hover:border-slate-600 rounded-full px-3 py-1.5 transition-colors flex items-center gap-1"
                >
                  <ChevronRight size={10} />
                  {s}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-3 items-end">
                <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-2 focus-within:border-blue-500/60 transition-colors">
                  <Sparkles size={14} className="text-blue-400 shrink-0" />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                    placeholder="Ask anything about your deployments, pipelines, or failures…"
                    disabled={thinking}
                    className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || thinking}
                  className="p-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT CONTEXT PANEL */}
          <aside className="w-64 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0">
            <div className="h-10 px-4 flex items-center border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Workspace Context</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Repository</p>
                <p className="text-xs font-mono text-slate-200">acme-corp/backend-api</p>
                <p className="text-[11px] text-slate-400">branch: main @ a4f3d19</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latest Run</p>
                <Badge status="failed">✕ Run #47 Failed</Badge>
                <p className="text-[11px] text-slate-400 font-mono">Kubernetes Rollout → Exit 1</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Environment Health</p>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Production</span>
                    <span className="text-rose-400">✕ Down</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Staging</span>
                    <span className="text-slate-300">● Up</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Preview</span>
                    <span className="text-slate-300">● Up</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Capabilities</p>
                {['Failure diagnosis', 'Root cause analysis', 'Pipeline optimization', 'Auto-fix suggestions', 'Deploy status', 'Secret rotation'].map((c) => (
                  <div key={c} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="text-blue-400">✓</span> {c}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DeveloperShell>
  );
}
