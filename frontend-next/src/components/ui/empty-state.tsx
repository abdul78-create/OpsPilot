import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div className={cn("p-12 text-center rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center", className)}>
      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 text-blue-400 flex items-center justify-center mb-4 shadow-md">
        <Icon size={24} />
      </div>
      <h3 className="text-sm font-bold text-slate-100 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
