/**
 * Strongly Typed StackDefinition & ExecutionGraph Contract
 */

export type Language = 'node' | 'python' | 'go' | 'java' | 'rust';
export type Framework = 'nextjs' | 'express' | 'fastapi' | 'gin' | 'spring' | 'unknown';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'pip' | 'go' | 'cargo';
export type DeploymentTarget = 'kubernetes' | 'render' | 'railway' | 'docker' | 'none';

export interface StackDefinition {
  language: Language;
  framework: Framework;
  packageManager: PackageManager;
  runtimeVersion: string;
  buildCommand: string;
  testCommand?: string;
  startCommand?: string;
  dockerfilePath?: string;
  deploymentTarget?: DeploymentTarget;
  detectedFiles: string[];
  capabilities: {
    docker: boolean;
    kubernetes: boolean;
    tests: boolean;
    monorepo: boolean;
  };
}

export interface ExecutionStage {
  id: string;
  name: string;
  stage: 'source' | 'build' | 'test' | 'security' | 'deploy';
  image: string;
  commands: string[];
  dependsOn: string[];
  timeoutSeconds: number;
  maxRetries: number;
  environment?: Record<string, string>;
  artifacts?: string[];
}

export interface ExecutionGraph {
  valid: boolean;
  version: number;
  pipelineId: string;
  stages: ExecutionStage[];
  executionPlan: string[];
}
