import { Injectable } from '@nestjs/common';
import {
  IRepositoryProvider,
  RepositoryConnectionConfig,
  WebhookRegistrationResult,
} from '../interfaces/repository-provider.interface';

@Injectable()
export class GitHubRepositoryProvider implements IRepositoryProvider {
  async validateConnection(config: RepositoryConnectionConfig): Promise<boolean> {
    if (!config.repositoryUrl) return false;
    return config.repositoryUrl.includes('github.com');
  }

  async createWebhook(
    _config: RepositoryConnectionConfig,
    _webhookUrl: string,
  ): Promise<WebhookRegistrationResult> {
    const mockWebhookId = `gh_wh_${Date.now()}`;
    const mockWebhookSecret = `gh_sec_${Math.random().toString(36).substring(2)}`;
    return {
      webhookId: mockWebhookId,
      webhookSecret: mockWebhookSecret,
    };
  }

  async deleteWebhook(_config: RepositoryConnectionConfig, _webhookId: string): Promise<void> {
    return Promise.resolve();
  }

  async getDefaultBranch(_config: RepositoryConnectionConfig): Promise<string> {
    return Promise.resolve('main');
  }

  async listBranches(_config: RepositoryConnectionConfig): Promise<string[]> {
    return Promise.resolve(['main', 'development', 'staging']);
  }
}
