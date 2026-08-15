'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { History, GitCommit, RotateCcw, Plus, Edit3 } from 'lucide-react';

export interface PipelineGitHistoryProps {
  open: boolean;
  onClose: () => void;
  onRestoreVersion: (version: string) => void;
}

export function PipelineGitHistory({ open, onClose, onRestoreVersion }: PipelineGitHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState('v31');

  const history = [
    {
      version: 'v31',
      author: 'Abdul',
      time: '10m ago',
      commitMsg: 'Add Trivy SAST Security Scan before K8s deployment step',
      changes: [
        { type: 'add', text: 'Added Trivy Security Scan node' },
        { type: 'edit', text: 'Updated K8s deploy target to prod-us-east-1' },
      ],
      isCurrent: true,
    },
    {
      version: 'v30',
      author: 'Sarah',
      time: '2h ago',
      commitMsg: 'Enable parallel integration test execution',
      changes: [
        { type: 'edit', text: 'Updated Jest test command flags --maxWorkers=4' },
      ],
    },
    {
      version: 'v29',
      author: 'Ahmed',
      time: '1d ago',
      commitMsg: 'Initial pipeline topology creation',
      changes: [
        { type: 'add', text: 'Created Git Source and Docker Build nodes' },
      ],
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} title="Pipeline Git & Version History" className="max-w-2xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Every workflow save creates an immutable version commit. Compare diffs and restore any version.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {history.map((h) => (
            <div
              key={h.version}
              className="p-4 rounded-xl border transition-all"
              style={{
                background: h.isCurrent ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                borderColor: h.isCurrent ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{h.version}</span>
                  {h.isCurrent && (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                      style={{
                        background: 'var(--success-dim)',
                        borderColor: 'var(--success)',
                        color: 'var(--success)',
                      }}
                    >
                      Active
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>• {h.author}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({h.time})</span>
                </div>

                {!h.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onRestoreVersion(h.version);
                      onClose();
                    }}
                    className="gap-1 text-xs"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </Button>
                )}
              </div>

              <p className="text-xs mb-3" style={{ color: 'var(--text-primary)' }}>{h.commitMsg}</p>

              <div className="space-y-1 pt-2 border-t text-[11px]" style={{ borderColor: 'var(--border)' }}>
                {h.changes.map((c, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    {c.type === 'add' ? (
                      <span className="flex items-center gap-1 font-mono" style={{ color: 'var(--success)' }}>
                        <Plus size={11} /> added
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-mono" style={{ color: 'var(--info)' }}>
                        <Edit3 size={11} /> modified
                      </span>
                    )}
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
