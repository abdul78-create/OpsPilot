// Server Component — no "use client" directive
// generateStaticParams is required for static export (output: 'export')

import { RunDetailPage } from '@/components/runs/RunDetailPage';
import { DeveloperShellWrapper } from '@/components/runs/RunDetailPage';

interface RunDetailPageProps {
  params: Promise<{ runId: string }>;
}

export function generateStaticParams() {
  const intIds = Array.from({ length: 200 }, (_, i) => ({ runId: String(i + 1) }));
  const sentinel = [{ runId: 'shell' }];
  return [...intIds, ...sentinel];
}

export default async function RunDetailRoute({ params }: RunDetailPageProps) {
  const { runId } = await params;
  return <DeveloperShellWrapper runId={runId} />;
}
