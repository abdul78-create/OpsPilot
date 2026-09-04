import { ConfigService } from '@nestjs/config';

export const TRUSTED_PRODUCTION_FRONTEND = 'https://opspilot-frontend-zuxp.onrender.com';
export const TRUSTED_PRODUCTION_BACKEND = 'https://opspilot-backend-gd60.onrender.com';

/**
 * Resolves the trusted application frontend redirect URL.
 *
 * SECURITY REQUIREMENT:
 * OAuth callback redirect destinations MUST come from trusted server configuration.
 * Under NO circumstances should unvalidated incoming `referer` or `origin` headers
 * be used as a destination for token issuance (CWE-601: Open Redirect / Token Exfiltration).
 *
 * Evaluation order:
 * 1. Configured FRONTEND_URL in environment / ConfigService
 * 2. If running in local development (NODE_ENV !== 'production') and request is on localhost, allow localhost:3001
 * 3. Default to trusted production frontend URL
 */
export function getFrontendRedirectUrl(req: any, configService: ConfigService): string {
  const configured = configService
    ? configService.get<string>('FRONTEND_URL')
    : process.env.FRONTEND_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (configured && configured.trim()) {
    const trimmed = configured.trim().replace(/\/+$/, '');
    const isLocal = trimmed.includes('localhost') || trimmed.includes('127.0.0.1');

    // In production, reject localhost/local origins to prevent accidental broken redirects
    if (isProduction && isLocal) {
      return TRUSTED_PRODUCTION_FRONTEND;
    }

    return trimmed;
  }

  // If not explicitly configured:
  // In development, allow localhost:3001
  if (!isProduction) {
    const host = req?.headers?.['host'];
    if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      return 'http://localhost:3001';
    }
  }

  // In production or fallback, default to trusted production frontend URL
  return TRUSTED_PRODUCTION_FRONTEND;
}

/**
 * Resolves the backend OAuth callback URL.
 *
 * Evaluation order:
 * 1. Explicitly configured GOOGLE_CALLBACK_URL / GITHUB_CALLBACK_URL
 * 2. If running in local development (NODE_ENV !== 'production') and request is on localhost, use localhost port
 * 3. Default to trusted production backend callback URL
 */
export function getOAuthCallbackUrl(
  provider: 'google' | 'github',
  configService: ConfigService,
  req?: any,
): string {
  const envKey = provider === 'google' ? 'GOOGLE_CALLBACK_URL' : 'GITHUB_CALLBACK_URL';
  const configured = configService.get<string>(envKey) || process.env[envKey];
  if (configured && configured.trim()) {
    return configured.trim();
  }

  const isLocalDev = process.env.NODE_ENV !== 'production';
  if (isLocalDev) {
    const host = req?.headers?.['host'];
    if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
      const port = host.split(':')[1] || '3000';
      return `http://localhost:${port}/v1/auth/${provider}/callback`;
    }
  }

  return `${TRUSTED_PRODUCTION_BACKEND}/v1/auth/${provider}/callback`;
}
