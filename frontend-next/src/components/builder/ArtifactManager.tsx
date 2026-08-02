'use client';

import React, { useState } from 'react';
import { Download, FileCheck, HardDrive, Check, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ArtifactItem {
  id: string;
  name: string;
  size: string;
  checksum: string;
  type: string;
  createdAt: string;
}

export function ArtifactManager() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const artifacts: ArtifactItem[] = [
    { id: 'a1', name: 'backend-api-v1.4.0.tar.gz', size: '142.8 MB', checksum: 'sha256:4b7e9f2a8c3d', type: 'Docker Binary', createdAt: '14 min ago' },
    { id: 'a2', name: 'trivy-sast-report.json', size: '18.4 KB', checksum: 'sha256:9a1c2d3e4f5b', type: 'Security Scan', createdAt: '14 min ago' },
    { id: 'a3', name: 'coverage-report.html', size: '2.1 MB', checksum: 'sha256:7f8e9d0a1b2c', type: 'Test Results', createdAt: '14 min ago' },
  ];

  const handleDownload = (id: string, name: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      // Trigger browser download simulation
      const blob = new Blob([`OpsPilot Build Artifact: ${name}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    }, 800);
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-blue-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Build Artifacts & Storage</span>
        </div>
        <Badge status="healthy">S3 / MinIO Store</Badge>
      </div>

      <div className="space-y-2">
        {artifacts.map((item) => (
          <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <FileCheck size={16} className="text-blue-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-200 block">{item.name}</span>
                <span className="text-[10px] text-slate-500">{item.checksum} • {item.size}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{item.type}</span>
              <Button
                onClick={() => handleDownload(item.id, item.name)}
                disabled={downloadingId === item.id}
                variant="secondary"
                size="sm"
                className="gap-1.5 font-mono text-[11px]"
              >
                {downloadingId === item.id ? (
                  <span className="animate-spin text-xs">⚡</span>
                ) : (
                  <Download size={12} />
                )}
                <span>{downloadingId === item.id ? 'Downloading…' : 'Download'}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
