import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PipelineYamlParserService } from './services/pipeline-yaml-parser.service';
import { CompiledPipeline } from './interfaces/pipeline-schema.interface';

describe('PipelineYamlParserService Integration Tests', () => {
  let parser: PipelineYamlParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PipelineYamlParserService],
    }).compile();

    parser = module.get<PipelineYamlParserService>(PipelineYamlParserService);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. POSITIVE PARSING & DAG TOPOLOGICAL ORDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Positive: Multi-stage DAG parsing & topological execution ordering', () => {
    it('should parse a complete multi-stage pipeline and resolve topological layers', () => {
      const yaml = `
version: "1"
name: "Production CI/CD Engine"
trigger:
  on: [push, pull_request]
  branches: [main, "release/*"]
environment:
  GLOBAL_VAR: "ops-pilot-global"
  NODE_ENV: "production"
jobs:
  lint:
    image: node:20-alpine
    commands:
      - npm ci
      - npm run lint
  unit-test:
    image: node:20-alpine
    commands:
      - npm ci
      - npm test -- --coverage
    artifacts:
      paths:
        - coverage/
  build-app:
    image: node:20-alpine
    needs: [lint, unit-test]
    environment:
      BUILD_TARGET: "dist"
    commands:
      - npm run build
    artifacts:
      paths:
        - dist/
    retry:
      maxAttempts: 2
      delaySeconds: 15
  docker-publish:
    image: docker:24-dind
    needs: [build-app]
    stage: deploy
    commands:
      - docker build -t opspilot/app:latest .
      - docker push opspilot/app:latest
      `;

      const result: CompiledPipeline = parser.parseAndCompile(yaml, 'pipe-101');

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.name).toBe('Production CI/CD Engine');
      expect(result.version).toBe('1');
      expect(result.trigger.on).toEqual(['push', 'pull_request']);
      expect(result.trigger.branches).toEqual(['main', 'release/*']);
      expect(result.jobs.length).toBe(4);

      // Verify DAG layers
      // Layer 0: lint, unit-test (no dependencies)
      // Layer 1: build-app (needs lint, unit-test)
      // Layer 2: docker-publish (needs build-app)
      expect(result.executionPlan.length).toBe(3);
      expect(result.executionPlan[0].sort()).toEqual(['lint', 'unit-test'].sort());
      expect(result.executionPlan[1]).toEqual(['build-app']);
      expect(result.executionPlan[2]).toEqual(['docker-publish']);

      // Check job properties & env merging
      const buildJob = result.jobs.find((j) => j.id === 'build-app')!;
      expect(buildJob).toBeDefined();
      expect(buildJob.needs).toEqual(['lint', 'unit-test']);
      expect(buildJob.environment).toEqual({
        GLOBAL_VAR: 'ops-pilot-global',
        NODE_ENV: 'production',
        BUILD_TARGET: 'dist',
      });
      expect(buildJob.maxRetries).toBe(2);
      expect(buildJob.retryDelaySeconds).toBe(15);
      expect(buildJob.artifacts).toEqual(['dist/']);
      expect(buildJob.stage).toBe('build');

      const dockerJob = result.jobs.find((j) => j.id === 'docker-publish')!;
      expect(dockerJob.stage).toBe('deploy');
      expect(dockerJob.topoOrder).toBe(2);
    });

    it('should convert CompiledPipeline into legacy ExecutionGraph contract', () => {
      const yaml = `
version: "1"
name: "Simple Test & Deploy"
jobs:
  test:
    image: node:20-alpine
    commands:
      - npm test
  deploy:
    image: alpine:latest
    needs: [test]
    commands:
      - ./deploy.sh
      `;

      const compiled = parser.parseAndCompile(yaml, 'pipe-202');
      const graph = parser.toExecutionGraph(compiled, 'pipe-202');

      expect(graph.valid).toBe(true);
      expect(graph.pipelineId).toBe('pipe-202');
      expect(graph.stages.length).toBe(2);
      expect(graph.stages[0].id).toBe('test');
      expect(graph.stages[0].commands).toEqual(['npm test']);
      expect(graph.stages[1].id).toBe('deploy');
      expect(graph.stages[1].dependsOn).toEqual(['test']);
      expect(graph.executionPlan).toEqual(['test', 'deploy']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. NEGATIVE: CYCLE DETECTION & INVALID DEPENDENCIES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Negative: Cycle detection and unknown dependency validation', () => {
    it('should detect direct 2-node circular dependency (A <-> B)', () => {
      const yaml = `
version: "1"
name: "Cyclic Pipeline"
jobs:
  job-a:
    image: alpine:latest
    needs: [job-b]
    commands:
      - echo "A"
  job-b:
    image: alpine:latest
    needs: [job-a]
    commands:
      - echo "B"
      `;

      const result = parser.parseAndCompile(yaml);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Circular dependency detected'))).toBe(
        true,
      );
    });

    it('should detect indirect 3-node circular dependency (A -> B -> C -> A)', () => {
      const yaml = `
version: "1"
name: "3-Node Cyclic Pipeline"
jobs:
  job-a:
    image: alpine:latest
    needs: [job-c]
    commands: [echo "A"]
  job-b:
    image: alpine:latest
    needs: [job-a]
    commands: [echo "B"]
  job-c:
    image: alpine:latest
    needs: [job-b]
    commands: [echo "C"]
      `;

      const result = parser.parseAndCompile(yaml);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Circular dependency detected'))).toBe(
        true,
      );
    });

    it('should flag jobs with unknown dependency references', () => {
      const yaml = `
version: "1"
name: "Dangling Dependency Pipeline"
jobs:
  build:
    image: alpine:latest
    needs: [non-existent-pre-build-step]
    commands:
      - echo "Building"
      `;

      const result = parser.parseAndCompile(yaml);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("Job 'build' depends on unknown job 'non-existent-pre-build-step'"),
        ),
      ).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. NEGATIVE: SYNTAX & SCHEMA VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Negative: Syntax and Schema Errors', () => {
    it('should reject empty or whitespace-only YAML string', () => {
      expect(() => parser.parseAndCompile('')).toThrow(BadRequestException);
      expect(() => parser.parseAndCompile('   \n  \t ')).toThrow(BadRequestException);
    });

    it('should reject invalid YAML syntax', () => {
      const invalidYaml = `
version: "1"
name: [unterminated array
jobs:
  build:
    image: "alpine"
      `;
      expect(() => parser.parseAndCompile(invalidYaml)).toThrow(BadRequestException);
    });

    it('should reject YAML when top-level is not a mapping', () => {
      const arrayYaml = `
- item 1
- item 2
      `;
      expect(() => parser.parseAndCompile(arrayYaml)).toThrow(BadRequestException);
    });

    it('should flag missing image and empty commands in job definition', () => {
      const yaml = `
version: "1"
name: "Missing Fields"
jobs:
  broken-job:
    environment:
      FOO: bar
      `;

      const result = parser.parseAndCompile(yaml);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'jobs.broken-job.image')).toBe(true);
      expect(result.errors.some((e) => e.field === 'jobs.broken-job.commands')).toBe(true);
    });

    it('should flag unsupported schema version', () => {
      const yaml = `
version: "99"
name: "Future Pipeline"
jobs:
  test:
    image: alpine:latest
    commands: [echo "ok"]
      `;

      const result = parser.parseAndCompile(yaml);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field === 'version' && e.message.includes('Unsupported version'),
        ),
      ).toBe(true);
    });
  });
});
