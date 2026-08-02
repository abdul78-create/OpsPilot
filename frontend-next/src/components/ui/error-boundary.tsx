import * as React from "react"
import { AlertTriangle, RotateCcw, ExternalLink, Copy } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface ErrorBannerProps {
  title?: string
  message?: string
  requestId?: string
  docsUrl?: string
  onRetry?: () => void
  className?: string
}

export function ErrorBanner({
  title = "Runner Execution Failed",
  message = "Unable to connect to worker node worker-01-prod over gRPC stream.",
  requestId = "req_c93e4f1a89b2",
  docsUrl = "https://docs.opspilot.ai/errors/runner-disconnect",
  onRetry,
  className
}: ErrorBannerProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopyId = () => {
    if (requestId) {
      navigator.clipboard.writeText(requestId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={cn("p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 space-y-3", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-100">{title}</h4>
            <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{message}</p>
          </div>
        </div>

        {onRetry && (
          <Button onClick={onRetry} variant="destructive" size="sm" className="shrink-0 gap-1.5">
            <RotateCcw size={12} />
            <span>Retry</span>
          </Button>
        )}
      </div>

      <div className="pt-2 border-t border-rose-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-rose-300/80">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Request ID:</span>
          <button 
            onClick={handleCopyId} 
            className="flex items-center gap-1 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 hover:text-white transition-colors cursor-pointer"
            title="Click to copy Request ID"
          >
            <span>{requestId}</span>
            <Copy size={10} />
          </button>
          {copied && <span className="text-slate-200 text-[10px]">Copied!</span>}
        </div>

        {docsUrl && (
          <a 
            href={docsUrl} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1 text-rose-300 hover:underline hover:text-white transition-colors"
          >
            <span>Troubleshooting Guide</span>
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  )
}
