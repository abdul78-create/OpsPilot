'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Share2, Copy, Check, GitFork, ExternalLink } from 'lucide-react';

export interface PublicShareModalProps {
  open: boolean;
  onClose: () => void;
  onForkPipeline?: () => void;
}

export function PublicShareModal({ open, onClose, onForkPipeline }: PublicShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = 'https://opspilot.ai/pipeline/p-89a20b12';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Public Pipeline Share & Forking" className="max-w-lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          Anyone with this link can view, inspect node configurations, and fork this pipeline topology into their workspace.
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">Public Shareable Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 select-all"
            />
            <Button onClick={handleCopy} variant="primary" size="md" className="gap-1.5 shrink-0">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink size={13} />
            <span>Open Public View</span>
          </a>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onForkPipeline?.();
              onClose();
            }}
            className="gap-1.5"
          >
            <GitFork size={13} />
            <span>Fork Pipeline to Workspace</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
