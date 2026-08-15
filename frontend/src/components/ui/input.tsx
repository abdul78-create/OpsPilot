import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  label?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, id, ...props }, ref) => {
    const inputId = id || React.useId()

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-8 w-full rounded-lg bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 border border-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50 font-mono",
            error && "border-rose-800 focus:ring-rose-800",
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p className={cn("text-[11px]", error ? "text-rose-400 font-medium" : "text-slate-500")}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  label?: string
  helperText?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, id, ...props }, ref) => {
    const textareaId = id || React.useId()

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-300">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            "flex min-h-[80px] w-full rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 border border-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-slate-700 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono",
            error && "border-rose-800 focus:ring-rose-800",
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p className={cn("text-[11px]", error ? "text-rose-400 font-medium" : "text-slate-500")}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Input, Textarea }
