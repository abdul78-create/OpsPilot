export function getLiveCpuUsage(): number {
  // Returns oscillating realistic CPU value (between 22% and 34%)
  const now = Date.now() / 2000;
  return Math.round(26 + Math.sin(now) * 6 + Math.cos(now * 1.5) * 2);
}

export function getLiveMemoryUsage(): number {
  // Returns oscillating realistic Memory MB value (between 410 MB and 460 MB)
  const now = Date.now() / 3000;
  return Math.round(435 + Math.sin(now) * 20);
}

export function getDemoPrometheusMetrics(): string {
  const cpu = getLiveCpuUsage();
  const mem = getLiveMemoryUsage();
  return `# HELP opspilot_pipeline_runs_total Total pipeline runs executed
# TYPE opspilot_pipeline_runs_total counter
opspilot_pipeline_runs_total 154
# HELP opspilot_deployments_total Total deployments executed
# TYPE opspilot_deployments_total counter
opspilot_deployments_total 48
# HELP opspilot_active_containers Number of active containers
# TYPE opspilot_active_containers gauge
opspilot_active_containers 12
# HELP node_cpu_utilization_percent Node CPU Utilization
# TYPE node_cpu_utilization_percent gauge
node_cpu_utilization_percent ${cpu}
# HELP node_memory_allocated_bytes Node Memory Allocated
# TYPE node_memory_allocated_bytes gauge
node_memory_allocated_bytes ${mem * 1024 * 1024}
`;
}
