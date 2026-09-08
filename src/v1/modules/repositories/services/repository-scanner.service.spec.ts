import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryScannerService } from './repository-scanner.service';
import { WorkflowCompilerService } from '../../pipelines/workflow-compiler.service';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('RepositoryScannerService & WorkflowCompilerService', () => {
  let scanner: RepositoryScannerService;
  let compiler: WorkflowCompilerService;
  const tempDirs: string[] = [];

  const createTempDir = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opspilot-test-scan-'));
    tempDirs.push(dir);
    return dir;
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RepositoryScannerService, WorkflowCompilerService],
    }).compile();

    scanner = module.get<RepositoryScannerService>(RepositoryScannerService);
    compiler = module.get<WorkflowCompilerService>(WorkflowCompilerService);
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
    }
  });

  it('should scan local workspace and emit a valid StackDefinition', async () => {
    const rootDir = path.resolve(__dirname, '../../../../..');
    const stack = await scanner.scanRepository('local/workspace', rootDir);

    expect(stack).toBeDefined();
    expect(stack.language).toBe('node');
    expect(stack.detectedFiles).toContain('package.json');
    expect(stack.capabilities.docker).toBe(true);
  });

  it('should compile StackDefinition into a valid ExecutionGraph', async () => {
    const rootDir = path.resolve(__dirname, '../../../../..');
    const stack = await scanner.scanRepository('local/workspace', rootDir);
    const graph = compiler.compilePipeline(stack, 'pipe_test_1');

    expect(graph.valid).toBe(true);
    expect(graph.stages.length).toBeGreaterThanOrEqual(2);
    expect(graph.executionPlan).toContain('git-clone');
    expect(graph.executionPlan).toContain('install-and-build');
  });

  it('should NOT invent npm run build or npm test when package.json lacks them', async () => {
    const testDir = createTempDir();
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'no-scripts-app',
        version: '1.0.0',
        dependencies: { express: '^4.18.2' },
      }),
    );

    const stack = await scanner.scanRepository('local/test-no-scripts', testDir);

    expect(stack.language).toBe('node');
    expect(stack.framework).toBe('express');
    expect(stack.buildCommand).toBe('npm install');
    expect(stack.testCommand).toBeUndefined();
  });

  it('should detect build and test scripts when defined in package.json with yarn', async () => {
    const testDir = createTempDir();
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'yarn-app',
        scripts: {
          build: 'tsc',
          test: 'jest',
        },
      }),
    );
    fs.writeFileSync(path.join(testDir, 'yarn.lock'), '');

    const stack = await scanner.scanRepository('local/yarn-app', testDir);

    expect(stack.language).toBe('node');
    expect(stack.packageManager).toBe('yarn');
    expect(stack.buildCommand).toBe('yarn install --frozen-lockfile && yarn build');
    expect(stack.testCommand).toBe('yarn test');
  });

  it('should detect Python repository and omit testCommand if no tests exist', async () => {
    const testDir = createTempDir();
    fs.writeFileSync(path.join(testDir, 'requirements.txt'), 'fastapi==0.109.0\nuvicorn==0.27.0');
    fs.writeFileSync(path.join(testDir, 'main.py'), 'print("hello")');

    const stack = await scanner.scanRepository('local/python-app', testDir);

    expect(stack.language).toBe('python');
    expect(stack.packageManager).toBe('pip');
    expect(stack.buildCommand).toBe('pip install -r requirements.txt');
    expect(stack.testCommand).toBeUndefined();
  });

  it('should detect Python repository with pytest if test file exists', async () => {
    const testDir = createTempDir();
    fs.writeFileSync(path.join(testDir, 'requirements.txt'), 'flask==3.0.0');
    fs.writeFileSync(path.join(testDir, 'test_app.py'), 'def test_app(): pass');

    const stack = await scanner.scanRepository('local/python-tested', testDir);

    expect(stack.language).toBe('python');
    expect(stack.testCommand).toBe('pytest');
  });

  it('should detect Go repository with tests', async () => {
    const testDir = createTempDir();
    fs.writeFileSync(path.join(testDir, 'go.mod'), 'module example.com/app\n\ngo 1.22\n');
    fs.writeFileSync(path.join(testDir, 'main_test.go'), 'package main\n');

    const stack = await scanner.scanRepository('local/go-app', testDir);

    expect(stack.language).toBe('go');
    expect(stack.buildCommand).toBe('go build -v ./...');
    expect(stack.testCommand).toBe('go test ./...');
  });

  it('1. Repository with Prisma (prisma/schema.prisma) → includes npx prisma generate in buildCommand', async () => {
    const testDir = createTempDir();
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'prisma-app',
        scripts: { build: 'nest build' },
      }),
    );
    fs.writeFileSync(path.join(testDir, 'package-lock.json'), '{}');
    fs.mkdirSync(path.join(testDir, 'prisma'), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'prisma', 'schema.prisma'),
      'datasource db { provider = "postgresql" url = env("DATABASE_URL") }',
    );

    const stack = await scanner.scanRepository('local/prisma-app', testDir);

    expect(stack.language).toBe('node');
    expect(stack.packageManager).toBe('npm');
    expect(stack.buildCommand).toBe('npm ci && npx prisma generate && npm run build');
    expect(stack.detectedFiles).toContain('prisma/schema.prisma');
    expect(stack.capabilities.prisma).toBe(true);
  });

  it('2. Repository without Prisma → omits npx prisma generate from buildCommand', async () => {
    const testDir = createTempDir();
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'clean-app',
        scripts: { build: 'nest build' },
      }),
    );
    fs.writeFileSync(path.join(testDir, 'package-lock.json'), '{}');

    const stack = await scanner.scanRepository('local/clean-app', testDir);

    expect(stack.language).toBe('node');
    expect(stack.packageManager).toBe('npm');
    expect(stack.buildCommand).toBe('npm ci && npm run build');
    expect(stack.buildCommand).not.toContain('prisma generate');
    expect(stack.capabilities.prisma).toBe(false);
  });

  it('3. Repository with Prisma using pnpm → preserves package manager and adds npx prisma generate', async () => {
    const testDir = createTempDir();
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'pnpm-prisma-app',
        scripts: { build: 'next build' },
      }),
    );
    fs.writeFileSync(path.join(testDir, 'pnpm-lock.yaml'), '');
    fs.mkdirSync(path.join(testDir, 'prisma'), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'prisma', 'schema.prisma'),
      'datasource db { provider = "sqlite" url = "file:./dev.db" }',
    );

    const stack = await scanner.scanRepository('local/pnpm-prisma-app', testDir);

    expect(stack.language).toBe('node');
    expect(stack.packageManager).toBe('pnpm');
    expect(stack.buildCommand).toBe(
      'pnpm install --frozen-lockfile && npx prisma generate && pnpm run build',
    );
    expect(stack.capabilities.prisma).toBe(true);
  });

  describe('Native C/C++ Dependency & Toolchain Detection', () => {
    it('4. Repository with argon2 in package.json → selects node:20 with nativeModules capability', async () => {
      const testDir = createTempDir();
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'argon2-auth-app',
          scripts: { build: 'nest build', test: 'jest' },
          dependencies: { argon2: '^0.45.1', '@nestjs/core': '^10.0.0' },
        }),
      );
      fs.writeFileSync(path.join(testDir, 'package-lock.json'), '{}');

      const stack = await scanner.scanRepository('local/argon2-auth-app', testDir);

      expect(stack.language).toBe('node');
      expect(stack.runtimeVersion).toBe('node:20');
      expect(stack.capabilities.nativeModules).toBe(true);
      expect(stack.buildCommand).toBe('npm ci && npm run build');
    });

    it('5. Repository with bcrypt in package-lock.json → selects node:20 with build toolchain', async () => {
      const testDir = createTempDir();
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'bcrypt-app',
          scripts: { build: 'tsc' },
          dependencies: { express: '^4.18.2' },
        }),
      );
      fs.writeFileSync(
        path.join(testDir, 'package-lock.json'),
        JSON.stringify({
          name: 'bcrypt-app',
          lockfileVersion: 3,
          packages: {
            '': { name: 'bcrypt-app' },
            'node_modules/bcrypt': {
              version: '5.1.1',
              hasInstallScript: true,
            },
          },
        }),
      );

      const stack = await scanner.scanRepository('local/bcrypt-app', testDir);

      expect(stack.language).toBe('node');
      expect(stack.runtimeVersion).toBe('node:20');
      expect(stack.capabilities.nativeModules).toBe(true);
    });

    it('6. Repository with binding.gyp file → selects node:20 with build toolchain', async () => {
      const testDir = createTempDir();
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'gyp-app',
          scripts: { build: 'tsc' },
        }),
      );
      fs.writeFileSync(path.join(testDir, 'binding.gyp'), '{}');

      const stack = await scanner.scanRepository('local/gyp-app', testDir);

      expect(stack.language).toBe('node');
      expect(stack.runtimeVersion).toBe('node:20');
      expect(stack.capabilities.nativeModules).toBe(true);
    });

    it('7. Clean repository without native dependencies → selects lightweight node:20-alpine', async () => {
      const testDir = createTempDir();
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'pure-js-app',
          scripts: { build: 'next build' },
          dependencies: { react: '^18.2.0', next: '^14.0.0' },
        }),
      );
      fs.writeFileSync(path.join(testDir, 'package-lock.json'), '{}');

      const stack = await scanner.scanRepository('local/pure-js-app', testDir);

      expect(stack.language).toBe('node');
      expect(stack.runtimeVersion).toBe('node:20-alpine');
      expect(stack.capabilities.nativeModules).toBe(false);
    });

    it('8. Actual OpsPilot workspace containing argon2 → detects nativeModules and emits node:20', async () => {
      const rootDir = path.resolve(__dirname, '../../../../..');
      const stack = await scanner.scanRepository('local/workspace', rootDir);

      expect(stack.language).toBe('node');
      expect(stack.runtimeVersion).toBe('node:20');
      expect(stack.capabilities.nativeModules).toBe(true);
      expect(stack.buildCommand).toBe('npm ci && npx prisma generate && npm run build');
    });
  });
});
