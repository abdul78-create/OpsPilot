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
 * Supports up to 50,000 lines of scrollback. Theme matches OpsPilot's zinc-900 dark design.
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
          background: '#09090B',
          foreground: '#E4E4E7',
          cursor: '#7C3AED',
          cursorAccent: '#09090B',
          selectionBackground: '#7C3AED40',
          black: '#09090B',
          brightBlack: '#3F3F46',
          red: '#EF4444',
          brightRed: '#F87171',
          green: '#22C55E',
          brightGreen: '#4ADE80',
          yellow: '#EAB308',
          brightYellow: '#FACC15',
          blue: '#3B82F6',
          brightBlue: '#60A5FA',
          magenta: '#A855F7',
          brightMagenta: '#C084FC',
          cyan: '#06B6D4',
          brightCyan: '#22D3EE',
          white: '#E4E4E7',
          brightWhite: '#F4F4F5',
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

      // Banner
      terminal.writeln('\x1b[1;35m▸ OpsPilot Build Log\x1b[0m  \x1b[2m(hardware-accelerated · 50k lines scrollback)\x1b[0m');
      terminal.writeln('\x1b[2m─────────────────────────────────────────────────\x1b[0m');
      terminal.writeln('');

      if (stream) {
        let delay = 0;
        lines.forEach((line, i) => {
          const t = setTimeout(() => {
            // Line number prefix
            const num = String(i + 1).padStart(4, ' ');
            terminal.writeln(`\x1b[2m${num}\x1b[0m  ${ansiColorize(line)}`);
          }, delay);
          streamTimersRef.current.push(t);
          // Variable delay: faster for large batches
          delay += lines.length > 100 ? 30 : 120 + Math.random() * 60;
        });
      } else {
        lines.forEach((line, i) => {
          const num = String(i + 1).padStart(4, ' ');
          terminal.writeln(`\x1b[2m${num}\x1b[0m  ${ansiColorize(line)}`);
        });
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
      <style>{`
        .xterm { height: 100%; }
        .xterm-viewport { overflow-y: auto !important; }
        .xterm-screen { padding: 6px 8px; }
        .xterm .xterm-rows { font-feature-settings: "liga" 1, "calt" 1; }
      `}</style>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: 0 }} />
    </>
  );
}
