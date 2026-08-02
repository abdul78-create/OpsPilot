'use client';

import React, { useEffect, useRef } from 'react';

interface XTermPanelProps {
  lines: string[];
  /** Stream lines with a per-character delay for realism */
  stream?: boolean;
}

function ansiColorize(line: string): string {
  const lower = line.toLowerCase();
  // ANSI escape codes
  if (lower.includes('error') || lower.includes('failed') || lower.includes('exit code: 1')) {
    return `\x1b[31m${line}\x1b[0m`; // red
  }
  if (lower.includes('✓') || lower.includes('success') || lower.includes('passed') || lower.includes('complete') || lower.includes('done')) {
    return `\x1b[32m${line}\x1b[0m`; // green
  }
  if (lower.includes('warn') || lower.includes('waiting') || lower.includes('scanning')) {
    return `\x1b[33m${line}\x1b[0m`; // yellow
  }
  if (lower.includes('step ') || lower.includes('from ') || lower.includes('run ') || lower.includes('copy ')) {
    return `\x1b[36m${line}\x1b[0m`; // cyan
  }
  return `\x1b[37m${line}\x1b[0m`; // white
}

export function XTermPanel({ lines, stream = true }: XTermPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const streamTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    let terminal: import('@xterm/xterm').Terminal;
    let fitAddon: import('@xterm/addon-fit').FitAddon;

    async function init() {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      // Dispose any existing terminal
      termRef.current?.dispose();
      streamTimersRef.current.forEach(clearTimeout);
      streamTimersRef.current = [];

      terminal = new Terminal({
        theme: {
          background: '#020617',   // slate-950
          foreground: '#cbd5e1',   // slate-300
          cursor: '#38bdf8',       // sky-400
          selectionBackground: '#334155',
          black: '#0f172a',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#fbbf24',
          cyan: '#38bdf8',
          white: '#e2e8f0',
          brightBlack: '#475569',
          brightWhite: '#f8fafc',
        },
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
        fontSize: 12,
        lineHeight: 1.6,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        convertEol: true,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current!);
      fitAddon.fit();

      termRef.current = terminal;
      fitRef.current = fitAddon;

      // Write prompt header
      terminal.writeln('\x1b[90m$ opspilot run --stream\x1b[0m');
      terminal.writeln('');

      if (stream) {
        // Stream lines with a realistic delay
        let delay = 0;
        lines.forEach((line) => {
          const t = setTimeout(() => {
            terminal.writeln(ansiColorize(line));
          }, delay);
          streamTimersRef.current.push(t);
          delay += 180 + Math.random() * 120;
        });
      } else {
        lines.forEach((line) => terminal.writeln(ansiColorize(line)));
      }

      // Resize observer
      const ro = new ResizeObserver(() => fitAddon.fit());
      if (containerRef.current) ro.observe(containerRef.current);
      return () => ro.disconnect();
    }

    init();

    return () => {
      streamTimersRef.current.forEach(clearTimeout);
      termRef.current?.dispose();
    };
  // Re-run when lines change (new step selected)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lines)]);

  return (
    <>
      {/* xterm.js requires its own stylesheet */}
      <style>{`
        .xterm { height: 100%; }
        .xterm-viewport { overflow-y: auto !important; }
        .xterm-screen { padding: 4px; }
      `}</style>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: 0 }} />
    </>
  );
}
