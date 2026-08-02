import * as React from "react"
import { LucideIcon, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  trend?: string
  icon: LucideIcon
  className?: string
}

export function MetricCard({ title, value, trend, icon: Icon, className }: MetricCardProps) {
  return (
    <div className={cn("p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between select-none", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{title}</span>
        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
          <Icon size={15} />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight">{value}</div>
        {trend && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 font-mono">
            <TrendingUp size={12} className="text-slate-300" />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  )
}
