import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import { LogsService } from '../../log-streaming/logs.service';
import { LogLevel } from '@prisma/client';

export interface DockerRunOptions {
  pipelineRunId: string;
  jobId: string;
  image?: string;
  command: string;
  workingDir?: string;
  workspacePath?: string;
  network?: string;
  requiresInternet?: boolean;
  enableCache?: boolean;
  cacheVolumeName?: string;
  memoryLimit?: string;
  cpuLimit?: string;
  timeoutSeconds?: number;
}

@Injectable()
export class DockerRunnerService {
  private readonly logger = new Logger(DockerRunnerService.name);

  constructor(private readonly logsService?: LogsService) {}

  /**
   * Executes a job step inside an isolated Docker container with strict resource limits,
   * non-root execution, network sandboxing by default, and persistent cache mounts.
   * Supports RUNNER_DRIVER=process for cloud PaaS environments (like Render Background Workers).
   */
  async runStep(options: DockerRunOptions): Promise<{ exitCode: number }> {
    const image = options.image || 'node:20-alpine';
    const cmdStr = options.command;
    const volumeName = process.env.DOCKER_VOLUME_NAME || 'opspilot_workspaces_data';
    const cacheVolume =
      options.cacheVolumeName || process.env.DOCKER_CACHE_VOLUME || 'opspilot_cache_data';
    const memLimit = options.memoryLimit || process.env.RUNNER_MEMORY_LIMIT || '2g';
    const cpuLimit = options.cpuLimit || process.env.RUNNER_CPU_LIMIT || '2.0';
    const pidsLimit = process.env.RUNNER_PIDS_LIMIT || '200';

    // Default to 'none' (air-gapped network isolation) unless explicitly required
    const network =
      options.network ||
      (options.requiresInternet ? 'bridge' : process.env.RUNNER_NETWORK || 'bridge');
    const timeoutMs = (options.timeoutSeconds || 900) * 1000; // 15 min default timeout

    const securityArgs = [
      '--memory',
      memLimit,
      '--cpus',
      cpuLimit,
      '--pids-limit',
      pidsLimit,
      '--network',
      network,
      '--security-opt',
      'no-new-privileges:true',
      '--ulimit',
      'nofile=1024:1024',
      '--ulimit',
      'nproc=100:100',
    ];

    const volumeArgs: string[] = [];
    if (options.workspacePath) {
      // Reject any malicious attempts to mount docker socket
      if (options.workspacePath.includes('docker.sock')) {
        throw new Error('Security Violation: Mounting docker.sock is strictly forbidden');
      }
      volumeArgs.push('-v', `${volumeName}:/opspilot-workspaces`, '-w', options.workspacePath);
    }

    if (options.enableCache !== false) {
      volumeArgs.push('-v', `${cacheVolume}:/root/.npm`);
    }

    const isProcessDriver = process.env.RUNNER_DRIVER === 'process';
    const fullDockerCmd = isProcessDriver
      ? `sh -c "${cmdStr}" (workspace: ${options.workspacePath || '.'})`
      : `docker run --rm ${securityArgs.join(' ')} ${volumeArgs.join(' ')} ${image} sh -c "${cmdStr}"`;
    this.logger.log(`▸ ${fullDockerCmd}`);

    if (this.logsService) {
      await this.logsService.logAndEmit(
        options.pipelineRunId,
        LogLevel.INFO,
        isProcessDriver
          ? `▸ [Process Runner] Executing step in workspace (Timeout: ${options.timeoutSeconds || 900}s)`
          : `▸ [Sandbox] Executing in container (Mem: ${memLimit}, CPU: ${cpuLimit}, Net: ${network}, PIDs: ${pidsLimit})`,
        options.jobId,
      );
    }

    return new Promise((resolve, reject) => {
      const args = ['run', '--rm', ...securityArgs, ...volumeArgs, image, 'sh', '-c', cmdStr];
      const child = isProcessDriver
        ? spawn('sh', ['-c', cmdStr], {
            cwd:
              options.workspacePath && fs.existsSync(options.workspacePath)
                ? options.workspacePath
                : process.cwd(),
            env: process.env,
          })
        : spawn('docker', args);

      let isCompleted = false;
      const timer = setTimeout(() => {
        if (!isCompleted) {
          isCompleted = true;
          this.logger.warn(
            `Docker execution timed out after ${timeoutMs}ms. Terminating container.`,
          );
          child.kill('SIGKILL');
          resolve({ exitCode: 124 }); // Standard 124 timeout exit code
        }
      }, timeoutMs);

      child.stdout.on('data', async (data: Buffer) => {
        const text = data.toString();
        if (this.logsService) {
          for (const line of text.split('\n')) {
            if (line.trim()) {
              await this.logsService.logAndEmit(
                options.pipelineRunId,
                LogLevel.INFO,
                line.trim(),
                options.jobId,
              );
            }
          }
        }
        this.logger.log(text.trim());
      });

      child.stderr.on('data', async (data: Buffer) => {
        const text = data.toString();
        if (this.logsService) {
          for (const line of text.split('\n')) {
            if (line.trim()) {
              await this.logsService.logAndEmit(
                options.pipelineRunId,
                LogLevel.WARN,
                line.trim(),
                options.jobId,
              );
            }
          }
        }
        this.logger.warn(text.trim());
      });

      child.on('error', (err: Error) => {
        // This fires when the 'docker' binary is not found — a real infrastructure error
        const msg = `docker spawn error: ${err.message}`;
        this.logger.error(msg);
        reject(new Error(msg));
      });

      child.on('close', async (code: number | null) => {
        clearTimeout(timer);
        isCompleted = true;
        const exitCode = code ?? 1;
        const logLevel = exitCode === 0 ? LogLevel.INFO : LogLevel.ERROR;
        const exitMsg = `▸ docker run exit code: ${exitCode}`;
        this.logger.log(exitMsg);
        if (this.logsService) {
          await this.logsService.logAndEmit(
            options.pipelineRunId,
            logLevel,
            exitMsg,
            options.jobId,
          );
        }
        resolve({ exitCode });
      });
    });
  }

  /**
   * Evaluates if a Docker execution failure is transient (infrastructure error: daemon down, network timeout, daemon exit code 125/126)
   * or deterministic (code build error: exit code 1/2 from npm/tsc, test failure).
   */
  isTransientError(exitCode: number, errorMsg: string): boolean {
    if (exitCode === 125 || exitCode === 126 || exitCode === 127) {
      return true;
    }
    const lower = errorMsg.toLowerCase();
    const transientPhrases = [
      'cannot connect to the docker daemon',
      'connection refused',
      'network is unreachable',
      'i/o timeout',
      'docker spawn error',
      'registry response error',
    ];
    return transientPhrases.some((phrase) => lower.includes(phrase));
  }

  /**
   * Executes a job step with selective retry handling for transient infrastructure errors.
   */
  async runStepWithRetry(options: DockerRunOptions, maxRetries = 3): Promise<{ exitCode: number }> {
    let lastResult = { exitCode: 1 };
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        lastResult = await this.runStep(options);
        if (lastResult.exitCode === 0) return lastResult;

        // Check if error is transient before retrying
        if (!this.isTransientError(lastResult.exitCode, '')) {
          this.logger.log(
            `▸ Non-transient build/test failure (Exit code ${lastResult.exitCode}). Skipping retries.`,
          );
          return lastResult;
        }

        this.logger.warn(
          `▸ Transient container error detected (Attempt ${attempt}/${maxRetries}). Retrying...`,
        );
        await new Promise((r) => setTimeout(r, attempt * 500));
      } catch (err) {
        const errMsg = (err as Error).message;
        if (!this.isTransientError(125, errMsg) || attempt === maxRetries) {
          throw err;
        }
        this.logger.warn(
          `▸ Transient spawn error: ${errMsg} (Attempt ${attempt}/${maxRetries}). Retrying...`,
        );
        await new Promise((r) => setTimeout(r, attempt * 500));
      }
    }
    return lastResult;
  }
}
