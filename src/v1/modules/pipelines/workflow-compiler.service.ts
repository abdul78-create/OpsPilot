import { Injectable, Logger } from '@nestjs/common';
import {
  StackDefinition,
  ExecutionGraph,
  ExecutionStage,
} from '../repositories/interfaces/stack-definition.interface';

@Injectable()
export class WorkflowCompilerService {
  private readonly logger = new Logger(WorkflowCompilerService.name);

  /**
   * Generates a canonical OpsPilot YAML pipeline specification from repository metadata & detected stack.
   */
  generateYamlSpecFromRepo(
    repoName: string,
    defaultBranch: string = 'main',
    stackLanguage: string = 'node',
  ): string {
    const cleanRepoName = repoName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();

    let stagesYaml = `stages:
  - name: lint
    commands:
      - npm run lint
  - name: test
    commands:
      - npm test
  - name: build
    commands:
      - npm run build`;

    if (stackLanguage === 'python') {
      stagesYaml = `stages:
  - name: test
    commands:
      - pip install -r requirements.txt
      - pytest`;
    } else if (stackLanguage === 'go') {
      stagesYaml = `stages:
  - name: test
    commands:
      - go test ./...
  - name: build
    commands:
      - go build -v ./...`;
    }

    return `version: "1"
name: "${cleanRepoName || 'OpsPilot'} CI/CD Pipeline"
trigger:
  event: push
  branch: "${defaultBranch}"
${stagesYaml}
`;
  }

  /**
   * Compiles StackDefinition & raw pipeline configuration into a validated ExecutionGraph
   */
  compilePipeline(stack: StackDefinition, pipelineId: string = 'pipe_v1'): ExecutionGraph {
    const stages: ExecutionStage[] = [
      {
        id: 'stg_1_clone',
        name: 'git-clone',
        stage: 'source',
        image: 'alpine/git:latest',
        commands: ['git clone https://github.com/acme-corp/backend-api.git .'],
        dependsOn: [],
        timeoutSeconds: 120,
        maxRetries: 2,
      },
      {
        id: 'stg_2_install_build',
        name: 'install-and-build',
        stage: 'build',
        image: stack.language === 'node' ? 'node:20-alpine' : 'python:3.11-alpine',
        commands: [stack.buildCommand || 'npm ci && npm run build'],
        dependsOn: ['git-clone'],
        timeoutSeconds: 300,
        maxRetries: 1,
        artifacts: ['dist/', 'package.json'],
      },
    ];

    if (stack.capabilities.tests) {
      stages.push({
        id: 'stg_3_test',
        name: 'run-test-suite',
        stage: 'test',
        image: 'node:20-alpine',
        commands: [stack.testCommand || 'npm test -- --ci'],
        dependsOn: ['install-and-build'],
        timeoutSeconds: 180,
        maxRetries: 1,
      });
    }

    if (stack.capabilities.docker) {
      stages.push({
        id: 'stg_4_docker',
        name: 'docker-build-image',
        stage: 'deploy',
        image: 'docker:dind',
        commands: [
          `docker build -t acme-backend:latest -f ${stack.dockerfilePath || 'Dockerfile'} .`,
        ],
        dependsOn: stack.capabilities.tests ? ['run-test-suite'] : ['install-and-build'],
        timeoutSeconds: 600,
        maxRetries: 0,
      });
    }

    const executionPlan = stages.map((s) => s.name);

    this.logger.log(
      `Compiled ExecutionGraph for '${pipelineId}' [${stages.length} stages]: [${executionPlan.join(' → ')}]`,
    );

    return {
      valid: true,
      version: 1,
      pipelineId,
      stages,
      executionPlan,
    };
  }
}
