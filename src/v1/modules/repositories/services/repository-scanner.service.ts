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
    const hasBackendPkg = checkFile('backend/package.json');
    const hasFrontendPkg = checkFile('frontend/package.json');
    const hasDockerfile =
      checkFile('Dockerfile') ||
      checkFile('backend/Dockerfile') ||
      checkFile('frontend/Dockerfile');
    const hasDockerCompose = checkFile('docker-compose.yml') || checkFile('docker-compose.yaml');
    const hasK8s = checkFile('k8s') || checkFile('kubernetes');
    const hasRequirementsTxt = checkFile('requirements.txt');
    const hasGoMod = checkFile('go.mod');
    const hasPomXml = checkFile('pom.xml');
    const hasPnpmLock = checkFile('pnpm-lock.yaml') || checkFile('pnpm-workspace.yaml');
    const hasYarnLock = checkFile('yarn.lock');
    const hasPrisma = checkFile('prisma') || checkFile('backend/prisma');

    const isMonorepo = (hasBackendPkg && hasFrontendPkg) || checkFile('pnpm-workspace.yaml');

    let language: Language = 'node';
    let framework: Framework = 'express';
    let packageManager: PackageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm';
    let runtimeVersion = 'node:20-alpine';
    let buildCommand = 'npm ci --include=dev && npm run build';
    let testCommand = 'npm test -- --ci';
    const startCommand = 'npm start';

    if (isMonorepo) {
      this.logger.log(`✓ Monorepo detected: backend & frontend packages present`);
      language = 'node';
      framework = 'express';

      const backendBuild = hasPrisma
        ? 'cd backend && npm ci --include=dev && npx prisma generate && npm run build'
        : 'cd backend && npm ci --include=dev && npm run build';
      const frontendBuild = 'cd frontend && npm ci --include=dev && npm run build';

      buildCommand = `(${backendBuild}) && (${frontendBuild})`;
      testCommand = `(cd backend && npm test -- --ci) && (cd frontend && npm test -- --ci)`;
    } else if (hasPackageJson) {
      language = 'node';
      try {
        const pkgContent = JSON.parse(fs.readFileSync(path.join(scanDir, 'package.json'), 'utf-8'));
        const deps = { ...pkgContent.dependencies, ...pkgContent.devDependencies };
        if (deps.next) {
          framework = 'nextjs';
          buildCommand = 'npm ci --include=dev && npm run build';
        } else if (deps.express || deps['@nestjs/core']) {
          framework = 'express';
        }
      } catch {
        // Default node settings
      }
    } else if (hasRequirementsTxt) {
      language = 'python';
      framework = 'fastapi';
      packageManager = 'pip';
      runtimeVersion = 'python:3.11-alpine';
      buildCommand = 'pip install -r requirements.txt';
      testCommand = 'pytest';
    } else if (hasGoMod) {
      language = 'go';
      framework = 'gin';
      packageManager = 'go';
      runtimeVersion = 'golang:1.22-alpine';
      buildCommand = 'go build -o app .';
      testCommand = 'go test ./...';
    } else if (hasPomXml) {
      language = 'java';
      framework = 'spring';
      packageManager = 'npm';
      runtimeVersion = 'maven:3.9-eclipse-temurin';
      buildCommand = 'mvn clean package -DskipTests';
      testCommand = 'mvn test';
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
        tests: true,
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
