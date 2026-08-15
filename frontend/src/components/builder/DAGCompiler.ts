import { Node, Edge } from '@xyflow/react';

export interface DAGValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  executionOrder: string[];
}

/**
 * Validates a Directed Acyclic Graph (DAG):
 * 1. Checks for at least one trigger node.
 * 2. Checks for cycle loops (Kahn's Topological Sort).
 * 3. Identifies orphan nodes.
 * 4. Verifies edge connectivity.
 */
export function validateDAG(nodes: Node[], edges: Edge[]): DAGValidationResult {
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
  nodes: Node[],
  edges: Edge[],
  pipelineName: string = 'OpsPilot Visual Pipeline',
  branch: string = 'main',
): string {
  const { executionOrder } = validateDAG(nodes, edges);
  const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

  const orderedNodes = (executionOrder.length > 0 ? executionOrder : nodes.map((n) => n.id))
    .map((id) => nodeMap.get(id))
    .filter((n): n is Node => !!n);

  let yaml = `version: '1.0'\nname: ${pipelineName}\ntrigger:\n  branch: ${branch}\nstages:\n`;

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
      case 'deploy':
        yaml += `  - name: ${slug || 'deploy'}\n    jobs:\n      - name: k8s-rollout\n        image: bitnami/kubectl:latest\n        steps:\n          - name: deploy-production\n            run: kubectl apply -f k8s/ --namespace ${String(d.target || 'production')}\n`;
        break;
      case 'health':
        yaml += `  - name: ${slug || 'health-check'}\n    jobs:\n      - name: verify-probe\n        image: curlimages/curl:latest\n        steps:\n          - name: http-health-probe\n            run: curl -f ${String(d.endpoint || 'http://localhost:8080/health')} || exit 1\n`;
        break;
      case 'rollback':
        yaml += `  - name: ${slug || 'rollback'}\n    jobs:\n      - name: rollback-recovery\n        image: bitnami/kubectl:latest\n        steps:\n          - name: auto-revert\n            run: kubectl rollout undo deployment --namespace production\n`;
        break;
      case 'notification':
      default:
        yaml += `  - name: ${slug || 'notify'}\n    jobs:\n      - name: slack-notify\n        image: curlimages/curl:latest\n        steps:\n          - name: post-webhook\n            run: echo "Dispatching deployment notification"\n`;
        break;
    }
  });

  return yaml;
}
