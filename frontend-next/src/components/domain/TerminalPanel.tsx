import * as React from "react"
import { Terminal, Play, Pause, RotateCcw, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TerminalPanelProps {
  title?: string
  status?: string
  logs?: string
  className?: string
}

export function TerminalPanel({
  title = "Live Worker Output",
  status = "RUNNING",
  logs = "[00:00:01] INFO Initializing Docker runner container...\n[00:00:02] INFO Running npm ci --legacy-peer-deps\n[00:00:05] INFO Executing TypeScript compiler check (tsc -b)\n[00:00:07] INFO Build succeeded in 2.1s",
  className
}: TerminalPanelProps) {
  return (
    <div className={cn("rounded-xl bg-slate-950 border border-slate-800 flex flex-col overflow-hidden font-mono text-xs", className)}>
      {/* Header Controls */}
      <div className="h-10 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <Terminal size={14} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-200">{title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 font-bold">
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors" title="Pause Stream">
            <Pause size={13} />
          </button>
          <button className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors" title="Clear Logs">
            <RotateCcw size={13} />
          </button>
          <button className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors" title="Maximize">
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-4 overflow-y-auto max-h-64 text-slate-300 space-y-1 font-mono leading-relaxed select-text">
        {logs.split('\n').map((line, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-600 select-none text-[10px] w-6">{i + 1}</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
