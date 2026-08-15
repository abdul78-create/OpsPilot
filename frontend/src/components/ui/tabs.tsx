'use client';

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
}

function Tabs({ defaultValue, value: controlledValue, onValueChange, className, children, ...props }: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn("space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'pills' | 'line'
}

function TabsList({ className, variant = 'line', children, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        variant === 'line'
          ? "flex items-center gap-6 border-b border-slate-800"
          : "flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}

function TabsTrigger({ value, icon: Icon, className, children, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within a Tabs component")

  const isActive = context.value === value

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        "flex items-center gap-2 text-xs font-semibold transition-all select-none cursor-pointer py-2 px-3 rounded-md",
        isActive
          ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50",
        className
      )}
      {...props}
    >
      {Icon && <Icon size={14} className={isActive ? "text-blue-400" : "text-slate-500"} />}
      <span>{children}</span>
    </button>
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within a Tabs component")

  if (context.value !== value) return null

  return (
    <div className={cn("animate-in fade-in duration-150", className)} {...props}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
