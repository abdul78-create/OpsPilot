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
    let scanDir = isRemote
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

      // If remote clone returned no files, check if the current process workspace is the repository
      try {
        const clonedFiles = fs.readdirSync(scanDir);
        if (clonedFiles.length === 0) {
          const cwdPkg = path.join(process.cwd(), 'package.json');
          if (fs.existsSync(cwdPkg)) {
            const cwdPkgData = JSON.parse(fs.readFileSync(cwdPkg, 'utf-8'));
            const repoSlug = repoUrl.toLowerCase().replace(/[^a-z0-9]/g, '');
            const pkgName = String(cwdPkgData.name || '')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');
            if (repoSlug.includes(pkgName) || pkgName.includes('opspilot')) {
              scanDir = process.cwd();
              this.logger.log(`✓ Using active workspace fallback for scan: ${scanDir}`);
            }
          }
        }
      } catch {}
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
    const hasPrisma =
      checkFile('prisma/schema.prisma') ||
      checkFile('backend/prisma/schema.prisma') ||
      checkFile('schema.prisma') ||
      checkFile('prisma') ||
      checkFile('backend/prisma');

    const isMonorepo = (hasBackendPkg && hasFrontendPkg) || checkFile('pnpm-workspace.yaml');

    let language: Language = 'node';
    let framework: Framework = 'express';
    let packageManager: PackageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm';
    let buildCommand: string | undefined = undefined;
    let testCommand: string | undefined = undefined;
    const startCommand = 'npm start';

    // Native dependency & build toolchain detection:
    // Detect native C/C++ addons (e.g. argon2, bcrypt, sharp, sqlite3, binding.gyp)
    // that require make, g++, and python3 during npm ci / npm install.
    const hasNativeModules = this.detectNativeDependencies(scanDir, checkFile);

    let nodeMajor = '20';
    if (hasPackageJson) {
      try {
        const pkgContent = JSON.parse(fs.readFileSync(path.join(scanDir, 'package.json'), 'utf-8'));
        if (pkgContent.engines && typeof pkgContent.engines.node === 'string') {
          const match = pkgContent.engines.node.match(/(\d+)/);
          if (match) {
            const major = parseInt(match[1], 10);
            if (major === 18 || major === 20 || major === 22) {
              nodeMajor = String(major);
            }
          }
        }
      } catch {}
    }

    let runtimeVersion = hasNativeModules ? `node:${nodeMajor}` : `node:${nodeMajor}-alpine`;
    if (hasNativeModules) {
      this.logger.log(
        `✓ Native Node dependencies detected — selecting image with C/C++ toolchain: ${runtimeVersion}`,
      );
    }

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
        ? `cd backend && ${hasPackageLock ? 'npm ci' : 'npm install'} && npx prisma generate${hasBackendBuild ? ' && npm run build' : ''}`
        : `cd backend && ${hasPackageLock ? 'npm ci' : 'npm install'}${hasBackendBuild ? ' && npm run build' : ''}`;
      const frontendBuildPart = `cd frontend && ${hasPackageLock ? 'npm ci' : 'npm install'}${hasFrontendBuild ? ' && npm run build' : ''}`;

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

        const declaredPm =
          typeof pkgContent.packageManager === 'string'
            ? pkgContent.packageManager.toLowerCase()
            : '';
        const isPnpm = hasPnpmLock || declaredPm.startsWith('pnpm');
        const isYarn = hasYarnLock || declaredPm.startsWith('yarn');
        const isBun =
          checkFile('bun.lockb') || checkFile('bun.lock') || declaredPm.startsWith('bun');

        let installCmd = 'npm install';
        if (isPnpm) {
          packageManager = 'pnpm';
          installCmd = 'pnpm install --frozen-lockfile';
        } else if (isYarn) {
          packageManager = 'yarn';
          installCmd = 'yarn install --frozen-lockfile';
        } else if (isBun) {
          installCmd = 'bun install --frozen-lockfile';
        } else if (hasPackageLock) {
          packageManager = 'npm';
          installCmd = 'npm ci';
        } else {
          packageManager = 'npm';
          installCmd = 'npm install';
        }

        const prismaPart = hasPrisma ? ' && npx prisma generate' : '';

        if (hasBuildScript) {
          buildCommand = isPnpm
            ? `${installCmd}${prismaPart} && pnpm run build`
            : isYarn
              ? `${installCmd}${prismaPart} && yarn build`
              : `${installCmd}${prismaPart} && npm run build`;
        } else {
          buildCommand = `${installCmd}${prismaPart}`;
        }

        if (hasTestScript) {
          testCommand = isPnpm ? 'pnpm test' : isYarn ? 'yarn test' : 'npm test -- --maxWorkers=2';
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
        prisma: hasPrisma,
        nativeModules: hasNativeModules,
      },
    };

    if (isRemote && scanDir !== process.cwd()) {
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
          HOME: process.env.HOME || process.env.USERPROFILE || os.tmpdir(),
        },
      });
      child.on('close', () => resolve());
      child.on('error', () => resolve());
    });
  }

  /**
   * Known native C/C++ packages and build toolchains that require
   * make, g++, gcc, and python3 during npm/yarn/pnpm installation.
   */
  private static readonly NATIVE_DEPENDENCY_NAMES = new Set([
    'argon2',
    'bcrypt',
    'sharp',
    'sqlite3',
    'better-sqlite3',
    'canvas',
    'node-sass',
    'node-gyp',
    're2',
    'snappy',
    'leveldown',
    'rocksdb',
    'couchbase',
    'microtime',
    'kerberos',
    'isolated-vm',
    'ffi-napi',
    'ref-napi',
    'sodium-native',
    'tree-sitter',
    'pg-native',
    'pcap',
    'serialport',
    'cpu-features',
    'keccak',
    'secp256k1',
    'usb',
    'node-pre-gyp',
    '@mapbox/node-pre-gyp',
    'cmake-js',
  ]);

  /**
   * Detects whether a Node.js repository has native dependencies or requires native build tooling
   * (e.g. node-gyp, make, g++, python3) from package.json, package-lock.json, or binding.gyp.
   */
  private detectNativeDependencies(scanDir: string, checkFile: (rel: string) => boolean): boolean {
    // 1. Direct binding.gyp check
    if (
      checkFile('binding.gyp') ||
      checkFile('backend/binding.gyp') ||
      checkFile('frontend/binding.gyp')
    ) {
      return true;
    }

    // 2. Direct package.json dependency inspection
    const packageJsonPaths = ['package.json', 'backend/package.json', 'frontend/package.json'];
    for (const pkgRel of packageJsonPaths) {
      const fullPath = path.join(scanDir, pkgRel);
      if (!fs.existsSync(fullPath)) continue;
      try {
        const pkgData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        const allDeps = {
          ...pkgData.dependencies,
          ...pkgData.devDependencies,
          ...pkgData.optionalDependencies,
          ...pkgData.peerDependencies,
        };

        for (const dep of Object.keys(allDeps)) {
          const lower = dep.toLowerCase();
          if (
            RepositoryScannerService.NATIVE_DEPENDENCY_NAMES.has(lower) ||
            lower.includes('node-gyp') ||
            lower.includes('node-addon-api') ||
            lower.includes('cmake-js') ||
            lower.includes('prebuild')
          ) {
            return true;
          }
        }

        if (pkgData.scripts && typeof pkgData.scripts === 'object') {
          for (const scriptVal of Object.values(pkgData.scripts)) {
            if (typeof scriptVal === 'string') {
              const lower = scriptVal.toLowerCase();
              if (
                lower.includes('node-gyp') ||
                lower.includes('cmake-js') ||
                /\bmake\b/.test(lower) ||
                /\bg\+\+\b/.test(lower)
              ) {
                return true;
              }
            }
          }
        }
      } catch {}
    }

    // 3. Lockfile inspection (package-lock.json)
    const lockfilePaths = [
      'package-lock.json',
      'backend/package-lock.json',
      'frontend/package-lock.json',
    ];
    for (const lockRel of lockfilePaths) {
      const fullPath = path.join(scanDir, lockRel);
      if (!fs.existsSync(fullPath)) continue;
      try {
        const lockData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        if (lockData.packages && typeof lockData.packages === 'object') {
          for (const pkgKey of Object.keys(lockData.packages)) {
            const pkgName = pkgKey.split('node_modules/').pop()?.toLowerCase();
            if (pkgName && RepositoryScannerService.NATIVE_DEPENDENCY_NAMES.has(pkgName)) {
              return true;
            }
            const pkgEntry = lockData.packages[pkgKey];
            if (pkgEntry) {
              if (pkgEntry.gypfile === true) return true;
              const deps = { ...pkgEntry.dependencies, ...pkgEntry.devDependencies };
              if (deps && (deps['node-gyp'] || deps['cmake-js'])) return true;
            }
          }
        }
        if (lockData.dependencies && typeof lockData.dependencies === 'object') {
          for (const depKey of Object.keys(lockData.dependencies)) {
            const depLower = depKey.toLowerCase();
            if (RepositoryScannerService.NATIVE_DEPENDENCY_NAMES.has(depLower)) {
              return true;
            }
          }
        }
      } catch {}
    }

    return false;
  }
}
