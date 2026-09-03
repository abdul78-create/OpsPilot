'use client';

import React, { useState } from 'react';
import {
  FileText, Shield, Activity, Rocket, GitBranch,
  ChevronRight, Clock, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { AiAnalysisReport } from '@/lib/apiClient';

interface AiReportsHistoryProps {
  reports: AiAnalysisReport[];
  onSelectReport: (report: AiAnalysisReport) => void;
}

export const AiReportsHistory: React.FC<AiReportsHistoryProps> = ({
  reports,
  onSelectReport,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = reports.filter((r) => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PIPELINE_OPTIMIZATION':
        return <GitBranch className="w-3.5 h-3.5 text-blue-500" />;
      case 'RUN_RCA':
        return <Activity className="w-3.5 h-3.5 text-rose-500" />;
      case 'DEPLOYMENT_RISK':
        return <Rocket className="w-3.5 h-3.5 text-purple-500" />;
      case 'SECURITY_AUDIT':
        return <Shield className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Analysis Reports History</h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            Verified analytical records persisted across tenant workloads
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[var(--surface-secondary)] p-1 rounded-lg border border-[var(--border-subtle)]">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PIPELINE_OPTIMIZATION', label: 'Pipelines' },
            { id: 'RUN_RCA', label: 'RCA' },
            { id: 'DEPLOYMENT_RISK', label: 'Releases' },
            { id: 'SECURITY_AUDIT', label: 'Security' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                filterType === t.id
                  ? 'bg-[var(--surface-primary)] text-indigo-500 font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--text-muted)]">
          No analysis reports recorded for this category yet. Run an analysis above to generate a report.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]/60">
          {filtered.map((report) => (
            <div
              key={report.id}
              onClick={() => onSelectReport(report)}
              className="py-3 px-2 flex items-center justify-between hover:bg-[var(--surface-secondary)]/40 rounded-lg cursor-pointer transition-colors text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center shrink-0">
                  {getTypeIcon(report.type)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">
                    {report.summary}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                    <span>{report.type.replace('_', ' ')}</span>
                    <span>·</span>
                    <span>{formatTimestamp(report.createdAt)}</span>
                    <span>·</span>
                    <span className="font-mono">Confidence: {Math.round(report.confidenceScore * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  report.riskLevel === 'CRITICAL'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    : report.riskLevel === 'HIGH'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {report.riskLevel}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
