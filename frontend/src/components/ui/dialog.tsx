'use client';

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={cn(
          "w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative animate-in zoom-in-95 duration-150",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
        </button>

        {title && <h2 className="text-base font-bold text-slate-100 tracking-tight">{title}</h2>}
        {description && <p className="text-xs text-slate-400 mt-1 mb-4">{description}</p>}

        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
