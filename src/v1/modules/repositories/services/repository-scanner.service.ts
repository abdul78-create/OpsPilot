import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import {
  StackDefinition,
  Language,
  Framework,
  PackageManager,
  DeploymentTarget,
} from '../interfaces/stack-definition.interface';

@Injectable()
export class RepositoryScannerService {
  private readonly logger = new Logger(RepositoryScannerService.name);

  /**
   * Clones a repository into a temporary directory, inspects codebase manifests,
   * detects monorepos / multi-service projects, and returns a strongly typed StackDefinition.
   */
  async scanRepository(repoUrl: string, targetDir: string): Promise<StackDefinition> {
    const isRemote =
      repoUrl.startsWith('http://') || repoUrl.startsWith('https://') || repoUrl.startsWith('git@');
    const uniqueScanId = crypto.randomBytes(4).toString('hex');
    const scanDir = isRemote
      ? path.join(
          os.tmpdir(),
          'opspilot-scans',
          `${Buffer.from(repoUrl).toString('hex').substring(0, 8)}_${Date.now()}_${uniqueScanId}`,
        )
      : targetDir;

    this.logger.log(`▸ Scanning repository codebase: ${repoUrl} → ${scanDir}`);

    if (isRemote) {
      try {
        if (fs.existsSync(scanDir)) {
          fs.rmSync(scanDir, { recursive: true, force: true });
        }
      } catch {}
      fs.mkdirSync(scanDir, { recursive: true });
      await this.gitClone(repoUrl, scanDir);
    }

    const detectedFiles: string[] = [];
    const checkFile = (relPath: string): boolean => {
      const fullPath = path.join(scanDir, relPath);
      const exists = fs.existsSync(fullPath);
      if (exists) detectedFiles.push(relPath);
      return exists;
    };

    const hasPackageJson = checkFile('package.json');
    const hasPackageLock = checkFile('package-lock.json');
    const hasBackendPkg = checkFile('backend/package.json');
    const hasFrontendPkg = checkFile('frontend/package.json');
    const hasDockerfile =
      checkFile('Dockerfile') ||
      checkFile('backend/Dockerfile') ||
      checkFile('frontend/Dockerfile');
    const hasDockerCompose = checkFile('docker-compose.yml') || checkFile('docker-compose.yaml');
    const hasK8s = checkFile('k8s') || checkFile('kubernetes');
    const hasRequirementsTxt = checkFile('requirements.txt');
    const hasPyprojectToml = checkFile('pyproject.toml');
    const hasPipfile = checkFile('Pipfile');
    const hasGoMod = checkFile('go.mod');
    const hasPomXml = checkFile('pom.xml');
    const hasGradle = checkFile('build.gradle') || checkFile('build.gradle.kts');
    const hasPnpmLock = checkFile('pnpm-lock.yaml') || checkFile('pnpm-workspace.yaml');
    const hasYarnLock = checkFile('yarn.lock');
    const hasPrisma = checkFile('prisma') || checkFile('backend/prisma');

    const isMonorepo = (hasBackendPkg && hasFrontendPkg) || checkFile('pnpm-workspace.yaml');

    let language: Language = 'node';
    let framework: Framework = 'express';
    let packageManager: PackageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm';
    let runtimeVersion = 'node:20-alpine';
    let buildCommand: string | undefined = undefined;
    let testCommand: string | undefined = undefined;
    const startCommand = 'npm start';

    // Helper: recursively check if any file in scanDir matches pattern
    const hasMatchingFile = (
      dir: string,
      pattern: RegExp,
      maxDepth = 3,
      currentDepth = 0,
    ): boolean => {
      if (currentDepth > maxDepth || !fs.existsSync(dir)) return false;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.venv')
            continue;
          if (entry.isFile() && pattern.test(entry.name)) return true;
          if (entry.isDirectory()) {
            if (hasMatchingFile(path.join(dir, entry.name), pattern, maxDepth, currentDepth + 1))
              return true;
          }
        }
      } catch {}
      return false;
    };

    if (isMonorepo) {
      this.logger.log(`✓ Monorepo detected: backend & frontend packages present`);
      language = 'node';
      framework = 'express';

      let hasBackendBuild = false;
      let hasBackendTest = false;
      let hasFrontendBuild = false;
      let hasFrontendTest = false;

      if (hasBackendPkg) {
        try {
          const bp = JSON.parse(
            fs.readFileSync(path.join(scanDir, 'backend/package.json'), 'utf-8'),
          );
          hasBackendBuild = Boolean(bp.scripts?.build);
          hasBackendTest = Boolean(bp.scripts?.test);
        } catch {}
      }
      if (hasFrontendPkg) {
        try {
          const fp = JSON.parse(
            fs.readFileSync(path.join(scanDir, 'frontend/package.json'), 'utf-8'),
          );
          hasFrontendBuild = Boolean(fp.scripts?.build);
          hasFrontendTest = Boolean(fp.scripts?.test);
        } catch {}
      }

      const backendBuildPart = hasPrisma
        ? `cd backend && ${hasPackageLock ? 'npm ci --legacy-peer-deps --ignore-scripts' : 'npm install --legacy-peer-deps --ignore-scripts'} && npx prisma generate${hasBackendBuild ? ' && npm run build' : ''}`
        : `cd backend && ${hasPackageLock ? 'npm ci --legacy-peer-deps --ignore-scripts' : 'npm install --legacy-peer-deps --ignore-scripts'}${hasBackendBuild ? ' && npm run build' : ''}`;
      const frontendBuildPart = `cd frontend && ${hasPackageLock ? 'npm ci --legacy-peer-deps --ignore-scripts' : 'npm install --legacy-peer-deps --ignore-scripts'}${hasFrontendBuild ? ' && npm run build' : ''}`;

      buildCommand = `(${backendBuildPart}) && (${frontendBuildPart})`;
      if (hasBackendTest || hasFrontendTest) {
        const testParts: string[] = [];
        if (hasBackendTest) testParts.push('cd backend && npm test');
        if (hasFrontendTest) testParts.push('cd frontend && npm test');
        testCommand = testParts.map((p) => `(${p})`).join(' && ');
      }
    } else if (hasPackageJson) {
      language = 'node';
      try {
        const pkgContent = JSON.parse(fs.readFileSync(path.join(scanDir, 'package.json'), 'utf-8'));
        const deps = { ...pkgContent.dependencies, ...pkgContent.devDependencies };
        if (deps.next) {
          framework = 'nextjs';
        } else if (deps.express || deps['@nestjs/core']) {
          framework = 'express';
        }

        const scripts = pkgContent.scripts || {};
        const hasBuildScript = Boolean(scripts.build);
        const hasTestScript = Boolean(scripts.test);

        const installCmd = hasPnpmLock
          ? 'pnpm install --frozen-lockfile'
          : hasYarnLock
            ? 'yarn install --frozen-lockfile'
            : hasPackageLock
              ? 'npm ci --legacy-peer-deps --ignore-scripts'
              : 'npm install --legacy-peer-deps --ignore-scripts';

        const prismaPart = hasPrisma ? ' && npx prisma generate' : '';

        if (hasBuildScript) {
          buildCommand = hasPnpmLock
            ? `${installCmd}${prismaPart} && pnpm run build`
            : hasYarnLock
              ? `${installCmd}${prismaPart} && yarn build`
              : `${installCmd}${prismaPart} && npm run build`;
        } else {
          buildCommand = `${installCmd}${prismaPart}`;
        }

        if (hasTestScript) {
          testCommand = hasPnpmLock
            ? 'pnpm test'
            : hasYarnLock
              ? 'yarn test'
              : 'npm test -- --maxWorkers=2';
        }
      } catch {
        buildCommand = 'npm install';
      }
    } else if (hasRequirementsTxt || hasPyprojectToml || hasPipfile) {
      language = 'python';
      framework = 'fastapi';
      runtimeVersion = 'python:3.11-alpine';

      if (hasPipfile) {
        packageManager = 'pipenv';
        buildCommand = 'pipenv install';
      } else if (hasPyprojectToml) {
        packageManager = 'pip';
        buildCommand = 'pip install .';
      } else {
        packageManager = 'pip';
        buildCommand = 'pip install -r requirements.txt';
      }

      const hasTestsDir = checkFile('tests') || checkFile('test');
      const hasTestFiles = hasMatchingFile(scanDir, /^test_.*\.py$|_test\.py$/);
      if (hasTestsDir || hasTestFiles) {
        testCommand = 'pytest';
      }
    } else if (hasGoMod) {
      language = 'go';
      framework = 'gin';
      packageManager = 'go';
      runtimeVersion = 'golang:1.22-alpine';
      buildCommand = 'go build -v ./...';

      const hasGoTests = hasMatchingFile(scanDir, /_test\.go$/);
      if (hasGoTests) {
        testCommand = 'go test ./...';
      }
    } else if (hasPomXml) {
      language = 'java';
      framework = 'spring';
      packageManager = 'maven';
      runtimeVersion = 'maven:3.9-eclipse-temurin';
      buildCommand = 'mvn clean package -DskipTests';
      const hasJavaTests = checkFile('src/test') || hasMatchingFile(scanDir, /Test\.java$/);
      if (hasJavaTests) {
        testCommand = 'mvn test';
      }
    } else if (hasGradle) {
      language = 'java';
      framework = 'spring';
      packageManager = 'gradle';
      runtimeVersion = 'gradle:jdk17-alpine';
      buildCommand = './gradlew build -x test';
      const hasJavaTests =
        checkFile('src/test') || hasMatchingFile(scanDir, /Test\.java$|Test\.kt$/);
      if (hasJavaTests) {
        testCommand = './gradlew test';
      }
    }

    const deploymentTarget: DeploymentTarget = hasK8s ? 'kubernetes' : 'docker';

    const stack: StackDefinition = {
      language,
      framework,
      packageManager,
      runtimeVersion,
      buildCommand,
      testCommand,
      startCommand,
      dockerfilePath: hasDockerfile ? 'Dockerfile' : undefined,
      deploymentTarget,
      detectedFiles,
      capabilities: {
        docker: hasDockerfile || hasDockerCompose,
        kubernetes: hasK8s,
        tests: Boolean(testCommand),
        monorepo: isMonorepo,
      },
    };

    if (isRemote) {
      try {
        if (fs.existsSync(scanDir)) {
          fs.rmSync(scanDir, { recursive: true, force: true });
        }
      } catch {}
    }

    this.logger.log(
      `✓ Scan complete for ${repoUrl}: Detected ${stack.language} (${stack.framework}${isMonorepo ? ' Monorepo' : ''}) using ${stack.packageManager}`,
    );
    return stack;
  }

  private gitClone(repoUrl: string, targetDir: string): Promise<void> {
    const normalizedUrl = repoUrl.replace(/\.git$/, '');
    return new Promise((resolve) => {
      const child = spawn('git', ['clone', '--depth', '1', normalizedUrl, targetDir], {
        shell: true,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_ASKPASS: '/bin/true',
          HOME: '/tmp',
        },
      });
      child.on('close', () => resolve());
      child.on('error', () => resolve());
    });
  }
}
