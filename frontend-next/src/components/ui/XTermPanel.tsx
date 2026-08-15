'use client';

import React, { useEffect, useRef } from 'react';

interface XTermPanelProps {
  lines: string[];
  /** Stream lines with a per-line delay for realism (default: true) */
  stream?: boolean;
}

function ansiColorize(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('failed') || lower.includes('exit code: 1')) {
    return `\x1b[31m${line}\x1b[0m`;
  }
  if (
    lower.includes('✓') || lower.includes('success') || lower.includes('passed') ||
    lower.includes('complete') || lower.includes('done') || lower.includes('built in')
  ) {
    return `\x1b[32m${line}\x1b[0m`;
  }
  if (lower.includes('warn') || lower.includes('waiting') || lower.includes('scanning')) {
    return `\x1b[33m${line}\x1b[0m`;
  }
  if (lower.includes('step ') || lower.includes('from ') || lower.includes('run ') || lower.includes('copy ')) {
    return `\x1b[36m${line}\x1b[0m`;
  }
  if (lower.includes('info') || lower.startsWith('[info]')) {
    return `\x1b[34m${line}\x1b[0m`;
  }
  return `\x1b[37m${line}\x1b[0m`;
}

/**
 * XTermPanel — hardware-accelerated XTerm.js canvas for pre-buffered log lines.
 * Supports up to 50,000 lines of scrollback.
 */
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

      // Dispose existing terminal
      termRef.current?.dispose();
      streamTimersRef.current.forEach(clearTimeout);
      streamTimersRef.current = [];

      terminal = new Terminal({
        theme: {
          background: '#09090b',
          foreground: '#e4e4e7',
          cursor: '#a1a1aa',
          cursorAccent: '#09090b',
          selectionBackground: 'rgba(255,255,255,0.15)',
          black: '#09090b',
          brightBlack: '#3f3f46',
          red: '#ef4444',
          brightRed: '#f87171',
          green: '#22c55e',
          brightGreen: '#4ade80',
          yellow: '#eab308',
          brightYellow: '#facc15',
          blue: '#60a5fa',
          brightBlue: '#93c5fd',
          magenta: '#d4d4d8',
          brightMagenta: '#f4f4f5',
          cyan: '#06b6d4',
          brightCyan: '#22d3ee',
          white: '#e4e4e7',
          brightWhite: '#ffffff',
        },
        fontFamily: '"JetBrains Mono", "Geist Mono", "Cascadia Code", "Fira Code", monospace',
        fontSize: 12.5,
        lineHeight: 1.5,
        letterSpacing: 0.3,
        cursorBlink: false,
        cursorStyle: 'bar',
        scrollback: 50000,
        convertEol: true,
        disableStdin: true,
        allowTransparency: true,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current!);
      fitAddon.fit();

      termRef.current = terminal;
      fitRef.current = fitAddon;

      // Welcome header
      terminal.writeln('\x1b[2m--- OpsPilot Execution Terminal (Hardware Accelerated) ---\x1b[0m');

      if (!stream || lines.length === 0) {
        // Fast dump without delay
        lines.forEach(l => terminal.writeln(ansiColorize(l)));
        return;
      }

      // Realistic staggered stream playback
      lines.forEach((line, i) => {
        const delay = Math.min(i * 12, 1200); // capped at 1.2s max total replay
        const t = setTimeout(() => {
          if (termRef.current) {
            terminal.writeln(ansiColorize(line));
          }
        }, delay);
        streamTimersRef.current.push(t);
      });
    }

    init();

    const ro = new ResizeObserver(() => {
      try { fitRef.current?.fit(); } catch { /* ignore */ }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      streamTimersRef.current.forEach(clearTimeout);
      termRef.current?.dispose();
      termRef.current = null;
    };
  }, [lines, stream]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[320px] p-2 select-text"
      style={{ background: 'var(--bg-primary)' }}
    />
  );
}
