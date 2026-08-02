'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FolderGit2, Sparkles, CheckCircle2, FileCode, Layers, ArrowRight, Loader2, Server, ShieldCheck } from 'lucide-react';

interface RepoScannerModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: (repoName: string, stack: string[]) => void;
}

interface DetectedFile {
  path: string;
  type: string;
  detail: string;
}

export function RepoScannerModal({ open, onClose, onImportComplete }: RepoScannerModalProps) {
  const [repoUrl, setRepoUrl] = useState('https://github.com/acme-corp/backend-api');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const detectedFiles: DetectedFile[] = [
    { path: 'package.json', type: 'Node.js 22', detail: 'Express, Jest, Prisma ORM' },
    { path: 'Dockerfile', type: 'Docker', detail: 'Multi-stage build (node:20-alpine)' },
    { path: 'k8s/deployment.yaml', type: 'Kubernetes', detail: 'Deployment + Service + HPA' },
    { path: 'terraform/main.tf', type: 'Terraform', detail: 'AWS EKS + RDS PostgreSQL' },
  ];

  const detectedStack = ['Node.js 22', 'Docker', 'Kubernetes', 'Terraform', 'PostgreSQL', 'Redis'];

  const handleStartScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 1800);
  };

  const handleGenerate = () => {
    onImportComplete('acme-corp/backend-api', detectedStack);
    onClose();
    setScanned(false);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Import & Scan Repository">
      <div className="space-y-5 select-none">
        <p className="text-xs text-slate-400">
          Enter a repository URL. OpsPilot will inspect project manifests, frameworks, Dockerfiles, and infrastructure files to auto-generate a tailored CI/CD pipeline.
        </p>

        {/* URL Input */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Repository URL</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200">
              <FolderGit2 size={14} className="text-blue-400 shrink-0" />
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-xs font-mono text-slate-200"
                placeholder="https://github.com/org/repo"
              />
            </div>
            <Button
              onClick={handleStartScan}
              disabled={scanning}
              variant="primary"
              size="sm"
              className="gap-1.5"
            >
              {scanning ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{scanning ? 'Scanning…' : 'Scan Stack'}</span>
            </Button>
          </div>
        </div>

        {/* Scanning Animation */}
        {scanning && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs text-blue-300 font-mono">
              <Loader2 size={13} className="animate-spin text-blue-400" />
              <span>Analyzing codebase architecture...</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-slate-400" />
                <span>Found package.json → Node.js 22 + Jest</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-slate-400" />
                <span>Found Dockerfile → Multi-stage build</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-slate-400" />
                <span>Found k8s/ → Kubernetes rollout manifests</span>
              </div>
            </div>
          </div>
        )}

        {/* Scanned Stack Summary */}
        {scanned && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Sparkles size={14} /> Stack Detected Successfully
                </span>
                <Badge status="healthy">100% Match</Badge>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {detectedStack.map((tech) => (
                  <span key={tech} className="text-[11px] font-mono text-slate-200 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Manifest List */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discovered Configuration Files</span>
              <div className="space-y-1.5">
                {detectedFiles.map((file) => (
                  <div key={file.path} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <FileCode size={13} className="text-slate-500" />
                      <span>{file.path}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{file.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {scanned && (
            <Button variant="primary" size="sm" onClick={handleGenerate} className="gap-1.5">
              <span>Generate Optimized Pipeline</span>
              <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
