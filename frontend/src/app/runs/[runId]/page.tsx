// Server Component — no "use client" directive
// generateStaticParams is required for static export (output: 'export')

import { DeveloperShellWrapper } from '@/components/runs/RunDetailPage';

interface RunDetailPageProps {
  params: Promise<{ runId: string }>;
}

export function generateStaticParams() {
  // Static export fallback sentinel; real UUIDs are resolved client-side from the browser URL.
  return [{ runId: 'shell' }];
}

export default async function RunDetailRoute({ params }: RunDetailPageProps) {
  const { runId } = await params;
  return <DeveloperShellWrapper runId={runId} />;
}
