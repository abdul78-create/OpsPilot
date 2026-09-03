import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface WorkspaceLease {
  pipelineRunId: string;
  workspacePath: string;
  isMounted: boolean;
}

@Injectable()
export class WorkspaceManagerService {
  private readonly logger = new Logger(WorkspaceManagerService.name);
  private readonly baseWorkspaceDir: string;

  constructor() {
    const defaultDir = fs.existsSync('/opspilot-workspaces')
      ? '/opspilot-workspaces'
      : path.join(os.tmpdir(), 'opspilot-workspaces');
    this.baseWorkspaceDir = process.env.WORKSPACE_BASE_DIR || defaultDir;
    try {
      if (!fs.existsSync(this.baseWorkspaceDir)) {
        fs.mkdirSync(this.baseWorkspaceDir, { recursive: true });
      }
    } catch (err) {
      this.logger.warn(
        `Could not create workspace base dir '${this.baseWorkspaceDir}': ${(err as Error).message}`,
      );
    }
  }

  private getSafeWorkspacePath(pipelineRunId: string): string {
    const safeRunId = path.basename(pipelineRunId);
    const resolvedPath = path.resolve(this.baseWorkspaceDir, safeRunId);
    if (!resolvedPath.startsWith(path.resolve(this.baseWorkspaceDir))) {
      throw new Error(`Invalid workspace path traversal attempt: ${pipelineRunId}`);
    }
    return resolvedPath;
  }

  /**
   * Prepares a workspace volume mount directory and clones the target Git repository into it.
   * Throws if git clone exits with non-zero code.
   */
  async prepareWorkspace(
    pipelineRunId: string,
    repoUrl: string,
    branch: string = 'main',
  ): Promise<WorkspaceLease> {
    const workspacePath = this.getSafeWorkspacePath(pipelineRunId);

    // Normalise URL: strip trailing .git suffix for anonymous HTTPS clones
    const normalizedUrl = repoUrl.replace(/\.git$/, '');

    this.logger.log(`▸ Preparing workspace for Run '${pipelineRunId}': ${workspacePath}`);

    try {
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
      fs.mkdirSync(workspacePath, { recursive: true });
    } catch (err) {
      this.logger.warn(`Workspace directory creation warning: ${(err as Error).message}`);
    }

    // Execute git clone — throws on non-zero exit code
    await this.cloneRepo(normalizedUrl, branch, workspacePath);

    return {
      pipelineRunId,
      workspacePath,
      isMounted: true,
    };
  }

  /**
   * Removes workspace lease directory after execution completes.
   */
  async cleanupWorkspace(pipelineRunId: string): Promise<void> {
    const workspacePath = this.getSafeWorkspacePath(pipelineRunId);
    try {
      if (fs.existsSync(workspacePath)) {
        this.logger.log(`▸ Cleaning up workspace for Run '${pipelineRunId}'`);
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
    } catch (err) {
      this.logger.warn(`Workspace cleanup warning: ${(err as Error).message}`);
    }
  }

  /**
   * Clones the git repository into targetPath.
   * Sets GIT_TERMINAL_PROMPT=0 and GIT_ASKPASS=/bin/true so git never blocks
   * on credential prompts inside a non-TTY container (works for public repos).
   * Rejects (throws) if git exits with a non-zero code so callers receive real evidence.
   */
  private async cloneRepo(repoUrl: string, branch: string, targetPath: string): Promise<void> {
    try {
      await this.runGitClone(['clone', '--depth', '1', '--branch', branch, repoUrl, targetPath]);
    } catch (firstErr) {
      this.logger.warn(
        `Primary branch clone ('${branch}') failed, trying default branch: ${(firstErr as Error).message}`,
      );
      // Clean up directory if partial clone created
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        fs.mkdirSync(targetPath, { recursive: true });
      }
      await this.runGitClone(['clone', '--depth', '1', repoUrl, targetPath]);
    }
  }

  private runGitClone(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`▸ git ${args.join(' ')}`);
      const stderrLines: string[] = [];

      const child = spawn('git', args, {
        shell: true,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_ASKPASS: '/bin/true',
          HOME: '/tmp',
        },
      });

      child.stderr.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        if (line) {
          stderrLines.push(line);
          this.logger.log(`git: ${line}`);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.logger.log(`✓ git ${args[0]} exit code: 0 → ${args[args.length - 1]}`);
          resolve();
        } else {
          const stderr = stderrLines.join('\n');
          const msg = `git clone exited with code ${code}: ${stderr}`;
          this.logger.error(msg);
          reject(new Error(msg));
        }
      });

      child.on('error', (err) => {
        const msg = `git spawn error: ${err.message}`;
        this.logger.error(msg);
        reject(new Error(msg));
      });
    });
  }
}
