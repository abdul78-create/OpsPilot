'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  FolderGit2, GitBranch, GitCommit, Folder, FileCode, FileText,
  FileJson, File, Play, Plus, RefreshCw, Copy, Check, ExternalLink,
  Loader2, Clock, User, ShieldCheck, Search,
} from 'lucide-react';
import {
  listRepositories, connectRepository, fetchRepositoryBranches,
  fetchRepositoryCommits, fetchRepositoryTree, fetchRepositoryFile,
  triggerPipeline, RepositoryConnection, GitHubBranchInfo,
  GitHubCommitInfo, GitHubFileItem, GitHubFileContent, DEFAULT_PROJECT_ID,
} from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx')
    return <FileCode size={14} className="text-[var(--info)] shrink-0" />;
  if (ext === 'json')
    return <FileJson size={14} className="text-[var(--warning)] shrink-0" />;
  if (ext === 'md' || ext === 'txt')
    return <FileText size={14} className="text-[var(--success)] shrink-0" />;
  if (fileName.toLowerCase().includes('dockerfile'))
    return <FileCode size={14} className="text-[var(--info)] shrink-0" />;
  return <File size={14} className="text-[var(--text-muted)] shrink-0" />;
}

export default function RepositoriesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [repositories, setRepositories] = useState<RepositoryConnection[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepositoryConnection | null>(null);
  const [branches, setBranches] = useState<GitHubBranchInfo[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [commits, setCommits] = useState<GitHubCommitInfo[]>([]);
  const [fileTree, setFileTree] = useState<GitHubFileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('package.json');
  const [fileContent, setFileContent] = useState<GitHubFileContent | null>(null);

  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [showCommitDrawer, setShowCommitDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoBranch, setNewRepoBranch] = useState('main');
  const [newRepoToken, setNewRepoToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  const loadRepositories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRepositories(DEFAULT_PROJECT_ID);
      const repos = res.data ?? [];
      setRepositories(repos);
      if (repos.length > 0) {
        setSelectedRepo(repos[0]);
      } else {
        const fallbackRepo: RepositoryConnection = {
          id: 'repo-demo-1',
          projectId: DEFAULT_PROJECT_ID,
          provider: 'GITHUB',
          repositoryUrl: 'https://github.com/expressjs/express',
          defaultBranch: 'main',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setRepositories([fallbackRepo]);
        setSelectedRepo(fallbackRepo);
      }
    } catch {
      toast({ kind: 'error', title: 'Failed to load repositories' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadRepositories(); }, [loadRepositories]);

  useEffect(() => {
    if (!selectedRepo) return;
    async function loadRepoMetadata() {
      setTreeLoading(true);
      try {
        const [bRes, cRes, tRes] = await Promise.allSettled([
          fetchRepositoryBranches(DEFAULT_PROJECT_ID, selectedRepo!.id),
          fetchRepositoryCommits(DEFAULT_PROJECT_ID, selectedRepo!.id),
          fetchRepositoryTree(DEFAULT_PROJECT_ID, selectedRepo!.id, '', selectedBranch),
        ]);
        if (bRes.status === 'fulfilled' && bRes.value.data) {
          setBranches(bRes.value.data);
          if (bRes.value.data.length > 0) setSelectedBranch(bRes.value.data[0].name);
        }
        if (cRes.status === 'fulfilled' && cRes.value.data) setCommits(cRes.value.data);
        if (tRes.status === 'fulfilled' && tRes.value.data) setFileTree(tRes.value.data);
      } catch { /* handled */ } finally {
        setTreeLoading(false);
      }
    }
    loadRepoMetadata();
  }, [selectedRepo, selectedBranch]);

  useEffect(() => {
    if (!selectedRepo || !selectedFile) return;
    async function loadFile() {
      setFileLoading(true);
      try {
        const res = await fetchRepositoryFile(DEFAULT_PROJECT_ID, selectedRepo!.id, selectedFile, selectedBranch);
        if (res.data) setFileContent(res.data);
      } catch {
        setFileContent({
          name: selectedFile.split('/').pop() || selectedFile,
          path: selectedFile,
          size: 1420,
          encoding: 'utf8',
          language: selectedFile.endsWith('.json') ? 'json' : 'typescript',
          content: `// Source: ${selectedFile}\n// Branch: ${selectedBranch}\n`,
        });
      } finally {
        setFileLoading(false);
      }
    }
    loadFile();
  }, [selectedRepo, selectedFile, selectedBranch]);

  const handleCopyCode = () => {
    if (!fileContent?.content) return;
    navigator.clipboard.writeText(fileContent.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ kind: 'info', title: 'Copied to clipboard' });
  };

  const handleConnectNewRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl) return;
    setConnecting(true);
    try {
      const res = await connectRepository(DEFAULT_PROJECT_ID, {
        provider: 'GITHUB',
        repositoryUrl: newRepoUrl,
        defaultBranch: newRepoBranch || 'main',
        accessToken: newRepoToken || undefined,
      });
      if (res.data) {
        toast({ kind: 'success', title: 'Repository connected successfully' });
        setRepositories(prev => [res.data, ...prev]);
        setSelectedRepo(res.data);
        setShowConnectModal(false);
        setNewRepoUrl('');
      }
    } catch {
      toast({ kind: 'error', title: 'Connection error', message: 'Verify URL and permissions' });
    } finally {
      setConnecting(false);
    }
  };

  const filteredTree = fileTree.filter(item =>
    item.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <DeveloperShell>
      <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3">

        {/* Top Control Bar */}
        <div className="h-14 px-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FolderGit2 size={15} className="text-[var(--text-muted)]" />
            <h1 className="text-sm font-bold text-[var(--text-primary)]">Repository Explorer</h1>

            {/* Repository Select */}
            <select
              value={selectedRepo?.id || ''}
              onChange={e => {
                const r = repositories.find(x => x.id === e.target.value);
                if (r) setSelectedRepo(r);
              }}
              className="text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--border-bright)] font-mono"
            >
              {repositories.map(repo => (
                <option key={repo.id} value={repo.id}>
                  {repo.repositoryUrl.replace('https://github.com/', '')}
                </option>
              ))}
            </select>

            {/* Branch Selector */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)]">
              <GitBranch size={12} className="text-[var(--text-muted)] shrink-0" />
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="bg-transparent text-xs text-[var(--text-secondary)] focus:outline-none font-mono"
              >
                {branches.length > 0 ? (
                  branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)
                ) : (
                  <option value="main">main</option>
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCommitDrawer(!showCommitDrawer)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showCommitDrawer
                  ? 'bg-[var(--bg-tertiary)] border-[var(--border-bright)] text-[var(--text-primary)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <GitCommit size={13} />
              <span>Commits ({commits.length})</span>
            </button>

            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-1.5 text-xs bg-[var(--accent)] text-[var(--accent-fg)] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            >
              <Plus size={13} />
              <span>Connect GitHub</span>
            </button>

            <button
              onClick={() => router.push('/builder')}
              className="flex items-center gap-1.5 text-xs text-[var(--success)] bg-[var(--success-dim)] border border-[var(--success)] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            >
              <Play size={13} />
              <span>Build Pipeline</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Explorer */}
        <div className="flex-1 flex gap-3 min-h-0">

          {/* File Tree */}
          <div className="w-72 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden shrink-0">
            <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
              <Search size={13} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                placeholder="Filter files..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {treeLoading ? (
                <div className="flex items-center justify-center py-12 text-[var(--text-muted)] text-xs gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Scanning files...</span>
                </div>
              ) : filteredTree.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">No files found</div>
              ) : (
                filteredTree.map(item => {
                  const isSelected = selectedFile === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => { if (item.type === 'file') setSelectedFile(item.path); }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors group ${
                        isSelected
                          ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-bright)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {item.type === 'dir' ? (
                          <Folder size={14} className="text-[var(--warning)] shrink-0" />
                        ) : (
                          getFileIcon(item.name)
                        )}
                        <span className="truncate font-mono">{item.name}</span>
                      </div>
                      {item.type === 'file' && item.size > 0 && (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                          {Math.round(item.size / 1024)}kb
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-2.5 bg-[var(--bg-tertiary)] border-t border-[var(--border)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
              <span>{fileTree.length} items</span>
              <span className="font-mono text-[10px]">GitHub API</span>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden">
            {/* Viewer Header */}
            <div className="h-11 px-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-tertiary)] shrink-0">
              <div className="flex items-center gap-2">
                {getFileIcon(selectedFile)}
                <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">{selectedFile}</span>
                {fileContent?.language && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)]">
                    {fileContent.language}
                  </span>
                )}
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] px-2.5 py-1 rounded border border-[var(--border)] transition-colors"
              >
                {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto bg-[var(--bg-primary)] p-4 font-mono text-xs text-[var(--text-secondary)]">
              {fileLoading ? (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)] gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading source content...</span>
                </div>
              ) : fileContent?.content ? (
                <pre className="leading-relaxed whitespace-pre font-mono text-[12px] text-[var(--text-secondary)]">
                  {fileContent.content.split('\n').map((line, idx) => (
                    <div key={idx} className="table-row">
                      <span className="table-cell pr-4 text-right select-none text-[var(--text-muted)] text-[11px] font-mono w-10">
                        {idx + 1}
                      </span>
                      <span className="table-cell">{line}</span>
                    </div>
                  ))}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                  Select a file from the tree to inspect source code
                </div>
              )}
            </div>
          </div>

          {/* Commit Drawer */}
          {showCommitDrawer && (
            <div className="w-80 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl flex flex-col overflow-hidden shrink-0">
              <div className="p-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-tertiary)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <GitCommit size={13} className="text-[var(--text-muted)]" />
                  <span>Commit Log</span>
                </div>
                <button
                  onClick={() => setShowCommitDrawer(false)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-mono"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {commits.map(c => (
                  <div key={c.sha} className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs space-y-1.5">
                    <p className="font-semibold text-[var(--text-primary)] line-clamp-2">{c.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1 truncate">
                        <User size={10} /> {c.authorName}
                      </span>
                      <span className="font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                        {c.sha.slice(0, 7)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Connect Repository Modal */}
        {showConnectModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-full max-w-md p-5 space-y-4 shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <FolderGit2 size={15} className="text-[var(--text-muted)]" />
                  <span>Connect GitHub Repository</span>
                </div>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs font-mono"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConnectNewRepo} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-medium">Repository URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/organization/repository"
                    value={newRepoUrl}
                    onChange={e => setNewRepoUrl(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-bright)] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-medium">Default Branch</label>
                  <input
                    type="text"
                    placeholder="main"
                    value={newRepoBranch}
                    onChange={e => setNewRepoBranch(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-bright)] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-medium">
                    Personal Access Token <span className="opacity-60">(optional for public repos)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={newRepoToken}
                    onChange={e => setNewRepoToken(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-bright)] font-mono text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={connecting}
                    className="flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-fg)] font-semibold px-4 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    {connecting ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    <span>Connect</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DeveloperShell>
  );
}
