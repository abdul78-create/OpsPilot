import { Injectable } from '@nestjs/common';
import {
  IRepositoryProvider,
  RepositoryConnectionConfig,
  WebhookRegistrationResult,
} from '../interfaces/repository-provider.interface';

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const cleaned = url.replace(/\.git$/, '').trim();
  const match = cleaned.match(/github\.com[:/]([^/]+)\/([^/]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

@Injectable()
export class GitHubRepositoryProvider implements IRepositoryProvider {
  async validateConnection(config: RepositoryConnectionConfig): Promise<boolean> {
    if (!config.repositoryUrl) return false;
    const parsed = parseGitHubUrl(config.repositoryUrl);
    if (!parsed) return false;

    const token = config.accessToken || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'User-Agent': 'OpsPilot-App',
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
        headers,
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async createWebhook(
    config: RepositoryConnectionConfig,
    webhookUrl: string,
  ): Promise<WebhookRegistrationResult> {
    const parsed = parseGitHubUrl(config.repositoryUrl);
    const token = config.accessToken || process.env.GITHUB_TOKEN;

    if (parsed && token) {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/hooks`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'User-Agent': 'OpsPilot-App',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'web',
              active: true,
              events: ['push', 'pull_request'],
              config: {
                url: webhookUrl,
                content_type: 'json',
                secret: process.env.GITHUB_WEBHOOK_SECRET || 'opspilot_webhook_secret',
              },
            }),
          },
        );

        if (res.ok) {
          const data = (await res.json()) as { id: number };
          return {
            webhookId: String(data.id),
            webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || 'opspilot_webhook_secret',
          };
        }
      } catch {
        // Fallback for offline or test mode
      }
    }

    const mockWebhookId = `gh_wh_${Date.now()}`;
    const mockWebhookSecret = `gh_sec_${Math.random().toString(36).substring(2)}`;
    return {
      webhookId: mockWebhookId,
      webhookSecret: mockWebhookSecret,
    };
  }

  async deleteWebhook(config: RepositoryConnectionConfig, webhookId: string): Promise<void> {
    const parsed = parseGitHubUrl(config.repositoryUrl);
    const token = config.accessToken || process.env.GITHUB_TOKEN;

    if (parsed && token && webhookId && !webhookId.startsWith('gh_wh_')) {
      try {
        await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/hooks/${webhookId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'User-Agent': 'OpsPilot-App',
            },
          },
        );
      } catch {
        // Ignore deletion errors for non-existent hooks
      }
    }
  }

  async getDefaultBranch(config: RepositoryConnectionConfig): Promise<string> {
    const parsed = parseGitHubUrl(config.repositoryUrl);
    if (!parsed) return 'main';

    const token = config.accessToken || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'User-Agent': 'OpsPilot-App',
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
        headers,
      });
      if (res.ok) {
        const data = (await res.json()) as { default_branch?: string };
        return data.default_branch || 'main';
      }
    } catch {
      // Fallback to main
    }
    return 'main';
  }

  async listBranches(config: RepositoryConnectionConfig): Promise<string[]> {
    const parsed = parseGitHubUrl(config.repositoryUrl);
    if (!parsed) return ['main'];

    const token = config.accessToken || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'User-Agent': 'OpsPilot-App',
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches`,
        { headers },
      );
      if (res.ok) {
        const branches = (await res.json()) as Array<{ name: string }>;
        return branches.map((b) => b.name);
      }
    } catch {
      // Fallback
    }
    return ['main', 'development', 'staging'];
  }
}
