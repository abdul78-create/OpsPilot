'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Terminal, ChevronRight, Zap, Code, Shield } from 'lucide-react';
import { useToast } from './Toast';

export function FloatingAiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; code?: string }>>([
    { sender: 'bot', text: 'Hi! I am your OpsPilot AI Copilot. How can I help you optimize or debug today?' },
  ]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const QUICK_PROMPTS = [
    { label: 'Analyze build', icon: Terminal, prompt: 'Analyze my last failed pipeline execution and locate the errors.' },
    { label: 'Explain failure', icon: Shield, prompt: 'Why do my Jest integration tests fail inside the Docker runner environment?' },
    { label: 'Generate pipeline', icon: Sparkles, prompt: 'Generate an optimized Next.js Docker deployment pipeline configuration.' },
    { label: 'Optimize Dockerfile', icon: Code, prompt: 'How can I minimize layer sizes and optimize build times for Node.js applications?' },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const streamBotResponse = (text: string, code?: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { sender: 'bot', text, code }]);
    }, 1500);
  };

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    if (!textToSend) setInput('');

    // Custom mock response logic based on query
    if (text.toLowerCase().includes('fail') || text.toLowerCase().includes('analyze')) {
      streamBotResponse(
        'Looking at your execution workspace runs... I detected a failure in stage "Test" during Jest compilation due to missing dependency config. Here is a suggested patch to your packages config:',
        '// Add Jest configuration variables\n"jest": {\n  "testEnvironment": "node",\n  "testTimeout": 10000\n}'
      );
    } else if (text.toLowerCase().includes('dockerfile') || text.toLowerCase().includes('optimize')) {
      streamBotResponse(
        'To optimize Node.js Dockerfiles, use multi-stage builds and install devDependencies only during the build stage. Here is an optimized layout:',
        'FROM node:20-alpine AS base\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\n\nFROM base AS builder\nCOPY . .\nRUN npm ci && npm run build'
      );
    } else if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('pipeline')) {
      streamBotResponse(
        'Generating unified pipeline definitions. Copy this schema into your project repository. It sets up automatic scanning, Docker build, test environment, and automated rollout with health checks:',
        'pipeline:\n  name: Node.js Service\n  trigger:\n    branch: main\n  stages:\n    - name: test\n      run: npm run test:ci\n    - name: deploy\n      provider: docker-runner'
      );
    } else {
      streamBotResponse(
        'I am analyzing your workspace. Let me know if you would like me to optimize a Dockerfile, construct a pipeline version, or explain runtime errors.'
      );
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Panel */}
      {open && (
        <div className="w-[360px] h-[480px] bg-[#111113] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#18181B] border-b border-[#27272A]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
                <Sparkles size={12} className="text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white">OpsPilot Assistant</span>
                <span className="text-[9px] text-emerald-400 font-medium ml-1.5 flex items-center gap-0.5 inline-block">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse-glow" /> Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : ''}`}>
                {m.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                    <Bot size={12} className="text-violet-400" />
                  </div>
                )}
                <div className="space-y-1.5 max-w-[80%]">
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-none'
                      : 'bg-[#18181B] text-zinc-300 rounded-tl-none border border-[#27272A]'
                  }`}>
                    {m.text}
                  </div>
                  {m.code && (
                    <div className="rounded-xl border border-[#27272A] bg-black/60 p-2.5 font-mono text-[10px] text-zinc-400 overflow-x-auto whitespace-pre leading-relaxed">
                      {m.code}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Loader */}
            {typing && (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-violet-400 animate-pulse-glow" />
                </div>
                <div className="p-3 bg-[#18181B] border border-[#27272A] rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="p-3 border-t border-[#1C1C1F] space-y-1.5">
              <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest px-1">Suggested Prompts</p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleSend(p.prompt)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#27272A] hover:border-violet-500/30 bg-[#18181B]/40 hover:bg-[#18181B] text-[10px] text-zinc-300 text-left transition-all"
                  >
                    <p.icon size={11} className="text-violet-400 shrink-0" />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 border-t border-[#1C1C1F] flex items-center gap-2 bg-[#18181B]/40 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-[#111113] border border-[#27272A] focus:border-violet-500/50 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 transition-all"
            />
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white shrink-0 transition-colors"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-semibold shadow-2xl transition-all duration-150 hover:-translate-y-0.5 group scale-105 active:scale-100"
      >
        <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
        <span>Ask Copilot</span>
      </button>
    </div>
  );
}
