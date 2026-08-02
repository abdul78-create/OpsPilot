'use client';

import React, { useState } from 'react';
import { MessageSquare, Users, User, X, Send } from 'lucide-react';
import { Badge } from '../ui/badge';

interface UserPresence {
  id: string;
  name: string;
  avatar: string;
  color: string;
  activity: string;
  nodeId?: string;
  position?: { x: number; y: number };
}

interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  stepName: string;
}

export function PresenceOverlay() {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  const activeUsers: UserPresence[] = [
    { id: '1', name: 'Razzaq', avatar: 'R', color: 'bg-blue-600', activity: 'editing Docker Build node', position: { x: 340, y: 190 } },
    { id: '2', name: 'Ali', avatar: 'A', color: 'bg-emerald-600', activity: 'reviewing K8s Deploy node', position: { x: 860, y: 190 } },
  ];

  const [comments, setComments] = useState<CommentItem[]>([
    { id: 'c1', author: 'Razzaq', avatar: 'R', text: 'Should we move Trivy SAST scan before Docker build to fail fast?', time: '10m ago', stepName: 'Trivy SAST Scan' },
    { id: 'c2', author: 'Ali', avatar: 'A', text: 'Good idea. I also verified the K8s rollout manifest for production.', time: '4m ago', stepName: 'Kubernetes Cluster' },
  ]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const item: CommentItem = {
      id: String(Date.now()),
      author: 'You',
      avatar: 'Y',
      text: newComment.trim(),
      time: 'Just now',
      stepName: 'Docker Container Build',
    };
    setComments([...comments, item]);
    setNewComment('');
  };

  return (
    <>
      {/* TOOLBAR PRESENCE BAR & COMMENTS BUTTON */}
      <div className="flex items-center gap-2 select-none">
        {/* Avatars */}
        <div className="flex items-center -space-x-2 overflow-hidden">
          {activeUsers.map((u) => (
            <div
              key={u.id}
              title={`${u.name} — ${u.activity}`}
              className={`w-6 h-6 rounded-full ${u.color} text-white flex items-center justify-center text-[10px] font-bold border-2 border-slate-900 shadow-sm cursor-pointer hover:scale-110 transition-transform`}
            >
              {u.avatar}
            </div>
          ))}
        </div>

        {/* Live Multiplayer Status Pill */}
        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          2 Live Collaborators
        </span>

        {/* Comments Button */}
        <button
          onClick={() => setCommentsOpen(!commentsOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
        >
          <MessageSquare size={13} className="text-blue-400" />
          <span>Comments</span>
          <Badge status="neutral">{comments.length}</Badge>
        </button>
      </div>

      {/* COMMENTS DRAWER MODAL */}
      {commentsOpen && (
        <div className="absolute top-16 right-4 z-40 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[420px] select-none animate-in fade-in zoom-in-95 duration-150">
          <div className="h-10 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-blue-400" /> Inline Pipeline Discussions
            </span>
            <button onClick={() => setCommentsOpen(false)} className="text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 text-xs">
            {comments.map((c) => (
              <div key={c.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                      {c.avatar}
                    </span>
                    <span>{c.author}</span>
                  </div>
                  <span className="text-slate-500 font-mono">{c.time}</span>
                </div>
                <div className="text-[10px] font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded w-fit">
                  @{c.stepName}
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed pt-0.5">{c.text}</p>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Add a comment on step..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
            <button onClick={handleAddComment} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors">
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
