import * as React from "react"
import { CheckCircle2, Clock, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineStep {
  name: string
  duration: string
  status: 'healthy' | 'pending' | 'failed'
}

interface TimelinePanelProps {
  steps?: TimelineStep[]
  className?: string
}

export function TimelinePanel({
  steps = [
    { name: 'Git Checkout', duration: '2s', status: 'healthy' },
    { name: 'Install Dependencies', duration: '14s', status: 'healthy' },
    { name: 'TypeScript Build', duration: '4s', status: 'healthy' },
    { name: 'Docker Container Build', duration: '22s', status: 'pending' },
  ],
  className
}: TimelinePanelProps) {
  return (
    <div className={cn("p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3", className)}>
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Pipeline Execution Timeline</h3>
        <span className="text-[10px] font-mono text-slate-400">Total: 42s</span>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2.5">
              {step.status === 'healthy' && <span className="text-slate-200">●</span>}
              {step.status === 'pending' && <span className="text-slate-400 font-bold">◌</span>}
              {step.status === 'failed' && <span className="text-slate-300 font-bold">✕</span>}
              <span className="font-medium text-slate-200">{step.name}</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">{step.duration}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
