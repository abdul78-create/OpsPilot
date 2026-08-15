import * as React from "react"
import { X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface InspectorPanelProps {
  title?: string
  subtitle?: string
  onClose?: () => void
  children: React.ReactNode
  className?: string
}

export function InspectorPanel({
  title = "Properties Inspector",
  subtitle = "Node configuration & environment bounds",
  onClose,
  children,
  className
}: InspectorPanelProps) {
  return (
    <aside className={cn("w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden select-none", className)}>
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-slate-400" />
          <div>
            <h3 className="text-xs font-bold text-slate-100 tracking-tight">{title}</h3>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
      </div>
    </aside>
  )
}
