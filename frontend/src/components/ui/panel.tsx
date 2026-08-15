import * as React from "react"
import { cn } from "@/lib/utils"

const Panel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl bg-slate-900 border border-slate-800 text-slate-100 overflow-hidden",
      className
    )}
    {...props}
  />
))
Panel.displayName = "Panel"

const PanelHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1 p-5 border-b border-slate-800/80",
      className
    )}
    {...props}
  />
))
PanelHeader.displayName = "PanelHeader"

const PanelTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-sm font-bold text-slate-100 tracking-tight leading-none",
      className
    )}
    {...props}
  />
))
PanelTitle.displayName = "PanelTitle"

const PanelDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-slate-400 leading-normal", className)}
    {...props}
  />
))
PanelDescription.displayName = "PanelDescription"

const PanelContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5", className)} {...props} />
))
PanelContent.displayName = "PanelContent"

const PanelFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-end gap-3 p-4 bg-slate-950/40 border-t border-slate-800/80",
      className
    )}
    {...props}
  />
))
PanelFooter.displayName = "PanelFooter"

export { Panel, PanelHeader, PanelTitle, PanelDescription, PanelContent, PanelFooter }
