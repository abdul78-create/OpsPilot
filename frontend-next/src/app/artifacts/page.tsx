'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  Package, Download, RefreshCw, FileArchive, Hash,
  HardDrive, Clock, ExternalLink, Eye, Search,
} from 'lucide-react';
import { listArtifacts, getArtifactDownloadUrl, Artifact } from '@/lib/apiClient';
import { SkeletonTableRows, EmptyState, SearchInput, CopyButton, Pagination } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';

function formatBytes(n?: number) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(d?: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function mimeIcon(mime?: string) {
  if (!mime) return <FileArchive size={14} className="text-slate-500" />;
  if (mime.includes('zip') || mime.includes('tar')) return <FileArchive size={14} className="text-amber-400" />;
  if (mime.includes('image')) return <Eye size={14} className="text-blue-400" />;
  return <Package size={14} className="text-slate-500" />;
}

const PAGE_SIZE = 25;

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listArtifacts();
      setArtifacts(res.data ?? []);
    } catch {
      toast({ kind: 'error', title: 'Failed to load artifacts' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = (a: Artifact) => {
    const url = a.downloadUrl ?? getArtifactDownloadUrl(a.id);
    window.open(url, '_blank');
    toast({ kind: 'success', title: 'Download started', message: a.name });
  };

  const filtered = artifacts.filter(a =>
    !search || (a.name + (a.sha256 ?? '')).toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalSize = artifacts.reduce((s, a) => s + (a.size ?? 0), 0);

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

        {/* Header */}
        <div className="h-14 px-4 rounded-xl bg-[#111113] border border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Package size={16} className="text-violet-400" />
            <h1 className="text-sm font-bold text-zinc-100">Artifacts</h1>
            <span className="text-[10px] font-mono text-zinc-500 border border-[#27272A] px-2 py-0.5 rounded-full">{artifacts.length} files</span>
            <span className="text-[10px] font-mono text-zinc-500 border border-[#27272A] px-2 py-0.5 rounded-full">{formatBytes(totalSize)} total</span>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 max-w-sm">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name or SHA256..." />
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 bg-[#111113] border border-[#27272A] rounded-xl overflow-hidden flex flex-col">
          <div className="h-9 px-4 border-b border-[#27272A] flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 bg-[#18181B]/40">
            <span className="w-5"></span>
            <span className="flex-1">Artifact</span>
            <span className="w-32">SHA256</span>
            <span className="w-20 text-right">Size</span>
            <span className="w-24 text-right">Created</span>
            <span className="w-20 text-right">Actions</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <SkeletonTableRows rows={6} cols={5} />
            ) : paginated.length === 0 ? (
              <EmptyState
                icon={<Package size={32} />}
                title="No artifacts"
                description="Artifacts are produced when pipelines run successfully"
              />
            ) : (
              paginated.map(a => (
                <div key={a.id} className="h-14 px-4 border-b border-[#27272A]/60 flex items-center gap-4 text-xs hover:bg-[#18181B]/20 transition-colors group">
                  <span className="w-5">{mimeIcon(a.mimeType)}</span>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-200 truncate">{a.name}</div>
                    {a.pipelineRunId && (
                      <div className="text-[10px] font-mono text-zinc-650 mt-0.5 font-medium">Run: {a.pipelineRunId.slice(0, 8)}</div>
                    )}
                  </div>

                  <div className="w-32 flex items-center gap-1">
                    {a.sha256 ? (
                      <>
                        <code className="text-[9px] font-mono text-zinc-500 truncate max-w-[72px]">{a.sha256.slice(0, 12)}…</code>
                        <CopyButton text={a.sha256} label="Copy" />
                      </>
                    ) : <span className="text-zinc-600">—</span>}
                  </div>

                  <div className="w-20 text-right font-mono text-[11px] text-zinc-400 flex items-center justify-end gap-1">
                    <HardDrive size={10} /> {formatBytes(a.size)}
                  </div>

                  <div className="w-24 text-right font-mono text-[10px] text-zinc-500 flex items-center justify-end gap-1">
                    <Clock size={10} /> {timeAgo(a.createdAt)}
                  </div>

                  <div className="w-20 flex justify-end gap-1">
                    <button
                      onClick={() => handleDownload(a)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-violet-400 hover:text-violet-300 border border-violet-800/20 bg-violet-900/10 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Download size={10} /> Get
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination page={page} total={filtered.length} limit={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>
    </DeveloperShell>
  );
}
