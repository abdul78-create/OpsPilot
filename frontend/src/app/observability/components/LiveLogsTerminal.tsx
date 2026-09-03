'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal, Search, Filter, Play, Pause, Trash2,
  Maximize2, Minimize2, ArrowDown, Radio, CheckCircle2,
  AlertTriangle, XCircle, Info
} from 'lucide-react';
import { PipelineRun, LogEntry, fetchRunLogs, openLogStream } from '@/lib/apiClient';

interface LiveLogsTerminalProps {
  activeRun: PipelineRun | null;
  selectedStageId?: string | null;
}

export const LiveLogsTerminal: React.FC<LiveLogsTerminalProps> = ({
  activeRun,
  selectedStageId,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load initial logs and connect to SSE stream
  useEffect(() => {
    if (!activeRun?.id) {
      setLogs([]);
      setIsStreaming(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // 1. Fetch historical logs
    fetchRunLogs(activeRun.id)
      .then((history) => {
        if (isMounted) {
          setLogs(history);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    // 2. Open SSE stream if run is active or recent
    if (activeRun.status === 'RUNNING' || activeRun.status === 'QUEUED') {
      setIsStreaming(true);
      if (unsubscribeRef.current) unsubscribeRef.current();

      unsubscribeRef.current = openLogStream(
        activeRun.id,
        (rawLine) => {
          if (isPaused) return;
          // Construct or append log entry
          const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: rawLine.includes('ERROR') ? 'ERROR' : rawLine.includes('WARN') ? 'WARN' : 'INFO',
            message: rawLine,
          };
          setLogs((prev) => [...prev, entry]);
        },
        () => {
          setIsStreaming(false);
        }
      );
    } else {
      setIsStreaming(false);
    }

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [activeRun?.id, activeRun?.status, isPaused]);

  // Auto-scroll when logs update
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter logs by search, level, and selected stage
  const filteredLogs = logs.filter((log) => {
    // Level filter
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;

    // Search query
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Selected stage filter
    if (selectedStageId) {
      const s = selectedStageId.toLowerCase();
      if (s.includes('build') && !log.message.toLowerCase().includes('build')) return false;
      if (s.includes('test') && !log.message.toLowerCase().includes('test')) return false;
      if (s.includes('deploy') && !log.message.toLowerCase().includes('deploy')) return false;
    }

    return true;
  });

  const clearVisualBuffer = () => {
    setLogs([]);
  };

  const formatLogTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '00:00:00';
    }
  };

  return (
    <div className={`bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl shadow-sm flex flex-col transition-all ${
      isExpanded ? 'fixed inset-4 z-50 p-6' : 'p-6 h-[460px]'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)] mb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Live Logs</h2>
            {isStreaming ? (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Streaming
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
                Complete
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">Real-time log stream from pipeline execution</p>
        </div>

        {/* Action controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
            />
          </div>

          {/* Level Filter dropdown/buttons */}
          <div className="flex items-center bg-[var(--surface-secondary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                  levelFilter === lvl
                    ? 'bg-[var(--surface-primary)] text-indigo-500 shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Clear Buffer */}
          <button
            onClick={clearVisualBuffer}
            title="Clear visual buffer"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors border border-[var(--border-subtle)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Expand / Minimize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand full screen'}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors border border-[var(--border-subtle)]"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 dark:bg-[#07090e] p-4 rounded-lg font-mono text-xs leading-relaxed select-text space-y-1"
      >
        {loading && logs.length === 0 && (
          <div className="text-slate-500 italic py-6 text-center">Loading execution logs...</div>
        )}

        {!loading && filteredLogs.length === 0 && (
          <div className="text-slate-500 italic py-6 text-center">
            {activeRun ? 'No matching logs found for this filter.' : 'Select or trigger a pipeline run to stream execution logs.'}
          </div>
        )}

        {filteredLogs.map((entry, idx) => {
          const isError = entry.level === 'ERROR' || entry.message.includes('[ERROR]');
          const isWarn = entry.level === 'WARN' || entry.message.includes('[WARN]');
          const isSuccess = entry.message.includes('✓') || entry.message.includes('SUCCESS');

          return (
            <div key={idx} className="flex items-start gap-2.5 hover:bg-white/5 px-1 py-0.5 rounded transition-colors group">
              {/* Line number */}
              <span className="text-slate-600 dark:text-slate-700 text-[10px] w-6 shrink-0 text-right select-none">
                {idx + 1}
              </span>

              {/* Timestamp */}
              <span className="text-slate-500 text-[11px] shrink-0 select-none">
                {formatLogTimestamp(entry.timestamp)}
              </span>

              {/* Level indicator */}
              <span className={`text-[10px] font-bold px-1 rounded shrink-0 select-none ${
                isError
                  ? 'bg-rose-500/20 text-rose-400'
                  : isWarn
                  ? 'bg-amber-500/20 text-amber-400'
                  : isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {entry.level}
              </span>

              {/* Message text */}
              <span className={`break-all ${
                isError
                  ? 'text-rose-300'
                  : isWarn
                  ? 'text-amber-300'
                  : isSuccess
                  ? 'text-emerald-300 font-medium'
                  : 'text-slate-200'
              }`}>
                {entry.message}
              </span>
            </div>
          );
        })}
      </div>

      {/* Terminal Footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] shrink-0 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{isStreaming ? 'Connected to stream' : 'Historical log loaded'}</span>
          <span className="text-[var(--border-subtle)]">|</span>
          <span>{filteredLogs.length} lines</span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span>Auto-scroll</span>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-0 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
