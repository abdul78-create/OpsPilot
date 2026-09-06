export interface DAGNode {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DAGEdge {
  id?: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface DAGValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  executionOrder: string[];
}

/**
 * Safely resolves the target deployment environment from node data.
 * Returns 'staging' or 'production', or null if ambiguous/unspecified.
 * CRITICAL SAFETY: Never silently fall back to 'production' for a staging request.
 */
export function resolveDeployEnvironment(d: Record<string, unknown>): 'staging' | 'production' | null {
  if (!d) return null;

  const target = String(d.target ?? '').toLowerCase().trim();
  const namespace = String(d.namespace ?? '').toLowerCase().trim();
  const environment = String(d.environment ?? '').toLowerCase().trim();
  const label = String(d.label ?? '').toLowerCase().trim();
  const manifest = String(d.manifest ?? '').toLowerCase();

  // Check explicit target / namespace / environment first
  const explicitCandidates = [target, namespace, environment];
  for (const cand of explicitCandidates) {
    if (cand === 'staging' || cand === 'stage' || cand === 'preprod' || cand === 'pre-prod' || cand === 'non-prod') {
      return 'staging';
    }
    if (cand === 'production' || cand === 'prod' || cand === 'live') {
      return 'production';
    }
  }

  // Check label & manifest
  const isStaging =
    /\b(staging|stage|preprod|pre-prod|non-?prod)\b/i.test(label) ||
    /namespace:\s*([a-zA-Z0-9_-]*stag[a-zA-Z0-9_-]*)\b/i.test(manifest) ||
    /environment:\s*staging\b/i.test(manifest);

  const isProduction =
    /\b(production|prod)\b/i.test(label) ||
    /namespace:\s*([a-zA-Z0-9_-]*prod[a-zA-Z0-9_-]*)\b/i.test(manifest) ||
    /environment:\s*production\b/i.test(manifest);

  if (isStaging && !isProduction) {
    return 'staging';
  }
  if (isProduction && !isStaging) {
    return 'production';
  }
  if (isStaging && isProduction) {
    // If conflict, check if label or target explicitly specified staging
    if (/\b(staging|stage|preprod|pre-prod|non-?prod)\b/i.test(label) || /\b(staging|stage|preprod|pre-prod|non-?prod)\b/i.test(target)) {
      return 'staging';
    }
    return null;
  }

  return null;
}

/**
 * Validates a Directed Acyclic Graph (DAG):
 * 1. Checks for at least one trigger node.
 * 2. Checks for cycle loops (Kahn's Topological Sort).
 * 3. Identifies orphan nodes.
 * 4. Verifies edge connectivity.
 * 5. Verifies deploy steps have a valid, unambiguous target environment.
 */
export function validateDAG(nodes: DAGNode[], edges: DAGEdge[]): DAGValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const executionOrder: string[] = [];

  if (!nodes || nodes.length === 0) {
    return {
      valid: false,
      errors: ['Pipeline canvas is empty. Add at least one trigger and build step.'],
      warnings: [],
      executionOrder: [],
    };
  }

  // 1. Verify Trigger/Source node existence
  const triggerNodes = nodes.filter((n) => n.type === 'source');
  if (triggerNodes.length === 0) {
    errors.push('Pipeline requires at least one Trigger / Source step (e.g. GitHub Trigger).');
  }

  // 2. Build adjacency list & in-degree map for Kahn's Algorithm
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    } else {
      warnings.push(`Dangling edge detected: ${e.source} -> ${e.target}`);
    }
  });

  // 3. Kahn's Algorithm for Topological Sort & Cycle Detection
  const queue: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) queue.push(id);
  });

  let visitedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    executionOrder.push(current);
    visitedCount++;

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (visitedCount < nodes.length) {
    errors.push('Circular dependency / cycle detected in pipeline DAG. Execution would deadlock.');
  }

  // 4. Check for orphan nodes (0 in-degree and 0 out-degree in multi-node graph)
  if (nodes.length > 1) {
    nodes.forEach((n) => {
      const outgoing = (adj.get(n.id) || []).length;
      const incoming = inDegree.get(n.id) ?? 0;
      if (outgoing === 0 && incoming === 0) {
        warnings.push(`Step '${String(n.data?.label ?? n.id)}' is disconnected from the workflow.`);
      }
    });
  }

  // 5. Verify deploy steps have a valid, unambiguous target environment
  const deployNodes = nodes.filter((n) => n.type === 'deploy');
  deployNodes.forEach((node) => {
    const d = (node.data || {}) as Record<string, unknown>;
    const env = resolveDeployEnvironment(d);
    if (!env) {
      errors.push(
        `Deploy step '${String(d.label || node.id)}' has an ambiguous or missing deployment environment. Must explicitly configure 'staging' or 'production'.`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    executionOrder,
  };
}

/**
 * Converts a ReactFlow visual DAG into OpsPilot standard YAML specification.
 */
export function dagToYaml(
  nodes: DAGNode[],
  edges: DAGEdge[],
  pipelineName: string = 'OpsPilot Visual Pipeline',
  branch: string = 'main',
): string {
  const { executionOrder } = validateDAG(nodes, edges);
  const nodeMap = new Map<string, DAGNode>(nodes.map((n) => [n.id, n]));

  const orderedNodes = (executionOrder.length > 0 ? executionOrder : nodes.map((n) => n.id))
    .map((id) => nodeMap.get(id))
    .filter((n): n is DAGNode => !!n);

  // Check if any deploy stage targets staging or production
  const deployNode = orderedNodes.find((n) => n.type === 'deploy');
  const resolvedDeployEnv = deployNode
    ? resolveDeployEnvironment((deployNode.data || {}) as Record<string, unknown>)
    : null;

  let finalPipelineName = pipelineName;
  if (resolvedDeployEnv === 'staging') {
    finalPipelineName = 'OpsPilot Staging Pipeline';
  } else if (resolvedDeployEnv === 'production') {
    if (finalPipelineName === 'OpsPilot Visual Pipeline' || !finalPipelineName.includes('Production')) {
      finalPipelineName = 'OpsPilot Production Pipeline';
    }
  }

  let yaml = `version: '1.0'\nname: ${finalPipelineName}\ntrigger:\n  branch: ${branch}\nstages:\n`;

  orderedNodes.forEach((node) => {
    const d = node.data || {};
    const type = node.type || 'build';
    const label = String(d.label || type);
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    switch (type) {
      case 'source':
        yaml += `  - name: ${slug || 'source'}\n    jobs:\n      - name: checkout-source\n        image: alpine/git:latest\n        steps:\n          - name: git-checkout\n            run: git clone ${String(d.repo || 'repository')} .\n`;
        break;
      case 'build':
        yaml += `  - name: ${slug || 'build'}\n    jobs:\n      - name: docker-build\n        image: ${String(d.image || 'node:20-alpine')}\n        steps:\n          - name: build-artifact\n            run: npm ci && npm run build\n`;
        break;
      case 'test':
        yaml += `  - name: ${slug || 'test'}\n    jobs:\n      - name: test-suite\n        image: ${String(d.image || 'node:20-alpine')}\n        steps:\n          - name: run-tests\n            run: ${String(d.command || 'npm test')}\n`;
        break;
      case 'security':
        yaml += `  - name: ${slug || 'security'}\n    jobs:\n      - name: security-audit\n        image: aquasec/trivy:latest\n        steps:\n          - name: trivy-scan\n            run: trivy fs --severity HIGH,CRITICAL .\n`;
        break;
      case 'approval':
        yaml += `  - name: ${slug || 'approval'}\n    jobs:\n      - name: manual-approval\n        image: alpine:latest\n        steps:\n          - name: gate-check\n            run: echo "Approved by ${String(d.approvers || 'ADMIN')}"\n`;
        break;
      case 'deploy': {
        const env = resolveDeployEnvironment(d as Record<string, unknown>);
        if (!env) {
          throw new Error(
            `Cannot compile deploy node '${slug || node.id}': deployment environment must be explicitly 'staging' or 'production'.`,
          );
        }
        let deployStageSlug = slug || `deploy-${env}`;
        if (env === 'staging' && (deployStageSlug.includes('prod') || deployStageSlug.includes('production'))) {
          deployStageSlug = 'deploy-staging';
        }
        const namespace = String(d.namespace ?? '').trim();
        if (!d.command && !namespace) {
          throw new Error(
            `Cannot compile deploy node '${slug || node.id}': deployment target configuration is missing (no command or namespace).`,
          );
        }
        const deployCmd = d.command
          ? String(d.command)
          : `kubectl apply -f k8s/ --namespace ${namespace}`;
        yaml += `  - name: ${deployStageSlug}\n    jobs:\n      - name: deploy-${env}\n        image: bitnami/kubectl:latest\n        steps:\n          - name: deploy-${env}\n            run: ${deployCmd}\n`;
        break;
      }
      case 'health':
        yaml += `  - name: ${slug || 'health-check'}\n    jobs:\n      - name: verify-probe\n        image: curlimages/curl:latest\n        steps:\n          - name: http-health-probe\n            run: curl -f ${String(d.endpoint || 'http://app-service:8080/health')} || exit 1\n`;
        break;
      case 'rollback': {
        let env = resolveDeployEnvironment(d as Record<string, unknown>);
        if (!env) {
          const deployNode = orderedNodes.find((n) => n.type === 'deploy');
          if (deployNode) {
            env = resolveDeployEnvironment((deployNode.data || {}) as Record<string, unknown>);
          }
        }
        const rollbackEnv = env || 'staging';
        yaml += `  - name: ${slug || 'rollback'}\n    jobs:\n      - name: rollback-recovery\n        image: bitnami/kubectl:latest\n        steps:\n          - name: auto-revert\n            run: kubectl rollout undo deployment --namespace ${rollbackEnv}\n`;
        break;
      }
      case 'notification':
      default:
        yaml += `  - name: ${slug || 'notify'}\n    jobs:\n      - name: slack-notify\n        image: curlimages/curl:latest\n        steps:\n          - name: post-webhook\n            run: echo "Dispatching deployment notification"\n`;
        break;
    }
  });

  return yaml;
}
