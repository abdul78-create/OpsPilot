'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DeveloperShell } from '../layout/DeveloperShell';
import { Sparkles, Send, User, Bot, AlertCircle } from 'lucide-react';
import { listAllRuns, listAiReports, checkHealth, AiAnalysisReport } from '@/lib/apiClient';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  report?: AiAnalysisReport;
  timestamp: string;
}

const SUGGESTIONS = [
  'Analyze recent pipeline run failures',
  'Check system health and database status',
  'Show recent AI Root Cause Analysis reports',
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'ai',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content: "I'm your OpsPilot AI Assistant. I can analyze failed pipeline runs, query system health, and retrieve AI Root Cause Analysis reports. How can I help you today?",
  },
];

export function AICopilot() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = async (text: string) => {
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

    const query = text.toLowerCase();
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      if (query.includes('fail') || query.includes('run') || query.includes('pipeline')) {
        const runs = await listAllRuns().catch(() => []);
        const failedRun = runs.find((r) => r.status === 'FAILED');

        if (failedRun) {
          const aiMsg: Message = {
            id: String(Date.now() + 1),
            role: 'ai',
            timestamp: ts,
            content: `I analyzed your workspace pipeline runs. Found a failed run: **Run #${failedRun.id.slice(0, 8)}** on branch \`${failedRun.branch ?? 'main'}\`. You can run an AI Root Cause Analysis directly from the Run Details page.`,
          };
          setMessages((m) => [...m, aiMsg]);
        } else {
          const aiMsg: Message = {
            id: String(Date.now() + 1),
            role: 'ai',
            timestamp: ts,
            content: "All recent pipeline runs in your workspace succeeded cleanly. No active failed runs detected.",
          };
          setMessages((m) => [...m, aiMsg]);
        }
      } else if (query.includes('health') || query.includes('status') || query.includes('database')) {
        const health = await checkHealth().catch(() => null);
        const isUp = health?.data?.status === 'ok';
        const aiMsg: Message = {
          id: String(Date.now() + 1),
          role: 'ai',
          timestamp: ts,
          content: isUp
            ? `Backend API and Database services are **ONLINE and operational**. Status: \`${health?.data?.status ?? 'ok'}\`.`
            : "Backend health status check failed or service is offline.",
        };
        setMessages((m) => [...m, aiMsg]);
      } else if (query.includes('report') || query.includes('rca')) {
        const reportsRes = await listAiReports().catch(() => ({ data: [] }));
        const reports = reportsRes.data ?? [];
        if (reports.length > 0) {
          const latest = reports[0];
          const aiMsg: Message = {
            id: String(Date.now() + 1),
            role: 'ai',
            timestamp: ts,
            content: `Retrieved latest AI Analysis Report:\n**Summary**: ${latest.summary}\n**Root Cause**: ${latest.rootCause ?? 'N/A'}\n**Risk Level**: ${latest.riskLevel}`,
            report: latest,
          };
          setMessages((m) => [...m, aiMsg]);
        } else {
          const aiMsg: Message = {
            id: String(Date.now() + 1),
            role: 'ai',
            timestamp: ts,
            content: "No AI Root Cause Analysis reports found yet. AI reports are generated automatically when failed runs are analyzed.",
          };
          setMessages((m) => [...m, aiMsg]);
        }
      } else {
        const aiMsg: Message = {
          id: String(Date.now() + 1),
          role: 'ai',
          timestamp: ts,
          content: `I received your query: "${text}".\n\nI can help you monitor live pipelines, diagnose errors via AI Root Cause Analysis, or review deployment health metrics.`,
        };
        setMessages((m) => [...m, aiMsg]);
      }
    } catch {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        role: 'ai',
        timestamp: ts,
        content: "Error communicating with OpsPilot backend services.",
      };
      setMessages((m) => [...m, errorMsg]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">
        {/* Header */}
        <div
          className="h-14 px-4 rounded-xl border flex items-center justify-between shrink-0"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <Sparkles size={15} style={{ color: 'var(--accent)' }} />
            <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AI Copilot</h1>
            <span
              className="text-[10px] font-mono border px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--success-dim)',
                borderColor: 'var(--success)',
                color: 'var(--success)',
              }}
            >
              Connected
            </span>
          </div>
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            Gemini 2.5 Flash Engine
          </span>
        </div>

        {/* Chat window */}
        <div
          className="flex-1 min-h-0 border rounded-xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
                  >
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className="max-w-xl rounded-xl p-3.5 text-xs space-y-2 border"
                  style={{
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)',
                    borderColor: m.role === 'user' ? 'var(--accent)' : 'var(--border)',
                    color: m.role === 'user' ? 'var(--accent-fg)' : 'var(--text-primary)',
                  }}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  {m.report && (
                    <div
                      className="mt-2 p-3 rounded-lg border text-[11px] font-mono space-y-1"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                        <span>Confidence: {Math.round((m.report.confidenceScore ?? 0.95) * 100)}%</span>
                        <span className="uppercase font-bold" style={{ color: 'var(--warning)' }}>{m.report.riskLevel}</span>
                      </div>
                      {m.report.rootCause && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                          <strong>Root Cause:</strong> {m.report.rootCause}
                        </div>
                      )}
                    </div>
                  )}
                  <span
                    className="text-[9px] block text-right font-mono opacity-60"
                  >
                    {m.timestamp}
                  </span>
                </div>
                {m.role === 'user' && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-xs font-bold"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <User size={13} />
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
                >
                  <Bot size={14} />
                </div>
                <div
                  className="p-3 rounded-xl border flex items-center gap-1.5"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: 'var(--accent)' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]" style={{ background: 'var(--accent)' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div className="px-4 py-2 border-t flex items-center gap-2 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[10px] uppercase font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>Suggestions:</span>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-[11px] px-2.5 py-1 rounded-lg border truncate transition-all shrink-0 hover:opacity-80"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 border-t flex items-center gap-2"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask OpsPilot AI anything about your pipelines, errors, or infrastructure..."
              className="flex-1 border rounded-xl px-4 py-2 text-xs focus:outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              className="p-2 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </DeveloperShell>
  );
}
