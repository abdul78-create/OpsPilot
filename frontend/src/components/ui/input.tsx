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
    const defaultId = React.useId();
    const inputId = id || defaultId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-8 w-full rounded-lg px-3 py-1.5 text-xs border transition-all focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 font-mono",
            className
          )}
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderColor: error ? 'var(--error)' : 'var(--border)',
          }}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p className="text-[11px]" style={{ color: error ? 'var(--error)' : 'var(--text-muted)' }}>
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
    const defaultId = React.useId();
    const textareaId = id || defaultId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            "flex min-h-[80px] w-full rounded-lg px-3 py-2 text-xs border transition-all focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono",
            className
          )}
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderColor: error ? 'var(--error)' : 'var(--border)',
          }}
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
