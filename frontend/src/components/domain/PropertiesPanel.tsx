import * as React from "react"
import { cn } from "@/lib/utils"

interface PropertyItem {
  label: string
  value: string
}

interface PropertiesPanelProps {
  items?: PropertyItem[]
  title?: string
  className?: string
}

export function PropertiesPanel({
  items = [
    { label: 'Environment', value: 'production' },
    { label: 'Node Version', value: '20.11-alpine' },
    { label: 'Max Memory', value: '512MB' },
    { label: 'Timeout', value: '300s' },
  ],
  title = "Node Properties",
  className
}: PropertiesPanelProps) {
  return (
    <div className={cn("p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3", className)}>
      <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800/80 pb-2">{title}</h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-0">
            <span className="text-slate-400 font-medium">{item.label}</span>
            <span className="font-mono text-slate-200">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
