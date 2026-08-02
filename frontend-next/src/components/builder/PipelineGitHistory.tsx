'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { History, GitCommit, RotateCcw, Plus, Trash2, Edit3 } from 'lucide-react';

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
        <p className="text-xs text-slate-400">
          Every workflow save creates an immutable version commit. Compare diffs and restore any version.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {history.map((h) => (
            <div
              key={h.version}
              onClick={() => setSelectedVersion(h.version)}
              className={`p-4 rounded-xl bg-slate-950 border transition-all cursor-pointer ${
                selectedVersion === h.version ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <GitCommit size={14} className="text-slate-400" />
                  <span className="font-bold text-slate-100">{h.version}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{h.author}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-500">{h.time}</span>
                </div>
                {h.isCurrent ? (
                  <Badge status="healthy">● Current Active</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestoreVersion(h.version);
                      onClose();
                    }}
                    className="gap-1"
                  >
                    <RotateCcw size={12} />
                    <span>Restore {h.version}</span>
                  </Button>
                )}
              </div>

              <p className="text-xs text-slate-200 font-medium mb-3 leading-relaxed">{h.commitMsg}</p>

              {/* Diffs */}
              <div className="space-y-1.5 pt-2 border-t border-slate-900 font-mono text-[11px]">
                {h.changes.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {c.type === 'add' && <Plus size={12} className="text-emerald-400" />}
                    {c.type === 'edit' && <Edit3 size={12} className="text-amber-400" />}
                    {c.type === 'delete' && <Trash2 size={12} className="text-rose-400" />}
                    <span className="text-slate-300">{c.text}</span>
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
