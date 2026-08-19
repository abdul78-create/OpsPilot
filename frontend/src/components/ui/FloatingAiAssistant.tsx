'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Terminal, Code, Shield } from 'lucide-react';

export function FloatingAiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; code?: string }>>([
    { sender: 'bot', text: 'Hi! I am your OpsPilot AI Copilot. How can I help you optimize or debug today?' },
  ]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        <div
          className="w-[360px] h-[480px] border rounded-2xl flex flex-col overflow-hidden mb-3 animate-slide-up"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <Sparkles size={12} />
              </div>
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>OpsPilot Assistant</span>
                <span
                  className="text-[9px] font-medium ml-1.5 inline-flex items-center gap-1"
                  style={{ color: 'var(--success)' }}
                >
                  <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
                  Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : ''}`}>
                {m.sender === 'bot' && (
                  <div
                    className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
                  >
                    <Bot size={12} />
                  </div>
                )}
                <div
                  className="max-w-[260px] rounded-xl p-3 text-xs leading-relaxed space-y-2 border"
                  style={{
                    background: m.sender === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)',
                    borderColor: m.sender === 'user' ? 'var(--accent)' : 'var(--border)',
                    color: m.sender === 'user' ? 'var(--accent-fg)' : 'var(--text-primary)',
                  }}
                >
                  <p>{m.text}</p>
                  {m.code && (
                    <div
                      className="p-2.5 rounded-lg font-mono text-[10px] overflow-x-auto border"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      <pre>{m.code}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2.5">
                <div
                  className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--accent)' }}
                >
                  <Bot size={12} />
                </div>
                <div
                  className="p-2.5 rounded-xl border flex items-center gap-1"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: 'var(--accent)' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]" style={{ background: 'var(--accent)' }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Chips */}
          <div
            className="p-2.5 border-t flex gap-1.5 overflow-x-auto"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
          >
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p.prompt)}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all shrink-0 hover:opacity-80"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <p.icon size={10} style={{ color: 'var(--accent)' }} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Input */}
          <div
            className="p-2.5 border-t flex items-center gap-2"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Copilot for analysis or suggestions..."
              className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border"
        style={{
          background: 'var(--accent)',
          borderColor: 'var(--accent)',
          color: 'var(--accent-fg)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {open ? <X size={18} /> : <Sparkles size={18} />}
      </button>
    </div>
  );
}
