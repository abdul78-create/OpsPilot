import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium select-none border transition-colors",
  {
    variants: {
      status: {
        healthy: "bg-slate-900 text-slate-200 border-slate-700/80",
        pending: "bg-slate-900/60 text-slate-400 border-slate-800",
        review: "bg-slate-900 text-slate-100 border-slate-600 font-semibold",
        failed: "bg-rose-950/40 text-rose-300 border-rose-800/60 font-semibold",
        success: "bg-emerald-950/40 text-emerald-300 border-emerald-800/60 font-semibold",
        running: "bg-blue-950/40 text-blue-300 border-blue-800/60 font-semibold",
        queued: "bg-slate-900/60 text-slate-400 border-slate-700",
        neutral: "bg-slate-950 text-slate-400 border-slate-800/80",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, status, children, ...props }: BadgeProps) {
  const renderIcon = () => {
    switch (status) {
      case "healthy":
        return <span className="text-slate-200">●</span>
      case "pending":
        return <span className="text-slate-400 font-bold">◌</span>
      case "review":
        return <span className="text-slate-100 font-bold">▲</span>
      case "failed":
        return <span className="text-slate-300 font-bold">✕</span>
      default:
        return null
    }
  }

  return (
    <span className={cn(badgeVariants({ status }), className)} {...props}>
      {renderIcon()}
      <span>{children}</span>
    </span>
  )
}

export { Badge, badgeVariants }
