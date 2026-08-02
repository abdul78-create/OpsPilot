import React from 'react';
import { Skeleton } from './skeleton';
import { Panel } from './panel';

export function MetricCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function TerminalSkeleton() {
  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <TimelineSkeleton />
          <TerminalSkeleton />
        </div>
        <div>
          <Panel className="p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </Panel>
        </div>
      </div>
    </div>
  );
}
