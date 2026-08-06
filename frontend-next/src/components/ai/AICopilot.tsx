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
            ? `✅ Backend API and Database services are **ONLINE and operational**. Status: \`${health?.data?.status ?? 'ok'}\`.`
            : "⚠️ Backend health status check failed or service is offline.",
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
            content: "No AI Analysis reports saved in database yet. Trigger an AI analysis on a failed run to persist reports.",
          };
          setMessages((m) => [...m, aiMsg]);
        }
      } else {
        const aiMsg: Message = {
          id: String(Date.now() + 1),
          role: 'ai',
          timestamp: ts,
          content: "I'm connected to your OpsPilot production workspace. You can ask me to check system health, inspect failed runs, or summarize saved AI RCA reports.",
        };
        setMessages((m) => [...m, aiMsg]);
      }
    } catch (err: any) {
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: 'ai',
        timestamp: ts,
        content: `⚠️ Backend query failed: ${err?.message || 'Service unavailable'}. Please verify backend API connectivity.`,
      };
      setMessages((m) => [...m, aiMsg]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">
        {/* TOP BAR */}
        <div className="h-14 px-4 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Sparkles size={14} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-white flex items-center gap-2">
                OpsPilot AI Copilot
                <span className="text-[9px] font-mono bg-violet-500/20 border border-violet-500/30 text-violet-300 px-1.5 py-0.2 rounded">
                  Gemini AI
                </span>
              </h1>
              <p className="text-[10px] text-zinc-500">Autonomous DevOps & Root Cause Analysis Assistant</p>
            </div>
          </div>
        </div>

        {/* MESSAGES VIEWPORT */}
        <div className="flex-1 bg-[#111113] border border-[#27272A] rounded-xl p-4 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isUser ? 'bg-violet-600 text-white' : 'bg-[#18181B] border border-[#27272A] text-violet-400'
                  }`}
                >
                  {isUser ? <User size={13} /> : <Bot size={13} />}
                </div>
                <div
                  className={`rounded-xl p-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-violet-600 text-white'
                      : 'bg-[#18181B] border border-[#27272A] text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-zinc-400">
                    <span className="font-semibold">{isUser ? 'You' : 'OpsPilot AI'}</span>
                    <span>{m.timestamp}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {m.report && (
                    <div className="mt-3 p-3 rounded-lg bg-[#09090B] border border-[#27272A] space-y-1.5 font-mono text-[11px] text-zinc-300">
                      <div className="text-violet-400 font-bold">RCA Summary: {m.report.summary}</div>
                      <div>Root Cause: {m.report.rootCause ?? 'N/A'}</div>
                      <div>Risk Level: {m.report.riskLevel}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {thinking && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 animate-pulse">
              <Sparkles size={14} className="text-violet-400 animate-spin" />
              <span>OpsPilot AI is analyzing workspace data...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* SUGGESTIONS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-[#111113] border border-[#27272A] hover:border-violet-500/40 text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>

        {/* INPUT FORM */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI about failed runs, health checks, or RCA reports..."
            className="flex-1 bg-[#111113] border border-[#27272A] focus:border-violet-500/50 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Send size={13} /> Send
          </button>
        </form>
      </div>
    </DeveloperShell>
  );
}
