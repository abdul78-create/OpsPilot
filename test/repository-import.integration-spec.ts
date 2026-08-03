import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryScannerService } from '../src/v1/modules/repositories/services/repository-scanner.service';
import { WorkflowCompilerService } from '../src/v1/modules/pipelines/workflow-compiler.service';
import * as path from 'path';

describe('RepositoryImportIntegration', () => {
  let scanner: RepositoryScannerService;
  let compiler: WorkflowCompilerService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RepositoryScannerService, WorkflowCompilerService],
    }).compile();

    scanner = module.get<RepositoryScannerService>(RepositoryScannerService);
    compiler = module.get<WorkflowCompilerService>(WorkflowCompilerService);
  });

  it('should scan local workspace and emit a valid StackDefinition', async () => {
    const rootDir = path.resolve(__dirname, '..');
    const stack = await scanner.scanRepository('local/workspace', rootDir);

    expect(stack).toBeDefined();
    expect(stack.language).toBe('node');
    expect(stack.detectedFiles).toContain('package.json');
    expect(stack.capabilities.docker).toBe(true);
  });

  it('should compile StackDefinition into a valid ExecutionGraph', async () => {
    const rootDir = path.resolve(__dirname, '..');
    const stack = await scanner.scanRepository('local/workspace', rootDir);
    const graph = compiler.compilePipeline(stack, 'pipe_test_1');

    expect(graph.valid).toBe(true);
    expect(graph.stages.length).toBeGreaterThanOrEqual(2);
    expect(graph.executionPlan).toContain('git-clone');
    expect(graph.executionPlan).toContain('install-and-build');
  });
});
