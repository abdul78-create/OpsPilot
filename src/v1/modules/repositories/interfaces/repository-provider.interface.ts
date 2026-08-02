export interface RepositoryConnectionConfig {
  repositoryUrl: string;
  authSecret?: string;
}

export interface WebhookRegistrationResult {
  webhookId: string;
  webhookSecret: string;
}

export interface IRepositoryProvider {
  validateConnection(config: RepositoryConnectionConfig): Promise<boolean>;
  createWebhook(
    config: RepositoryConnectionConfig,
    webhookUrl: string,
  ): Promise<WebhookRegistrationResult>;
  deleteWebhook(config: RepositoryConnectionConfig, webhookId: string): Promise<void>;
  getDefaultBranch(config: RepositoryConnectionConfig): Promise<string>;
  listBranches(config: RepositoryConnectionConfig): Promise<string[]>;
}
