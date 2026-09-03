import { ConfigService } from '@nestjs/config';

/**
 * Resolves the appropriate frontend URL dynamically based on environment configuration,
 * request headers (referer/origin/host), or local development defaults.
 */
export function getFrontendRedirectUrl(req: any, configService: ConfigService): string {
  const configured = configService.get<string>('FRONTEND_URL');
  if (
    configured &&
    configured.trim() &&
    !configured.includes('opspilot-frontend-zuxp.onrender.com')
  ) {
    return configured.trim().replace(/\/+$/, '');
  }

  const referer = req?.headers?.['referer'] || req?.headers?.['origin'];
  if (referer && typeof referer === 'string') {
    try {
      const parsed = new URL(referer);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // ignore
    }
  }

  const host = req?.headers?.['host'];
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    return 'http://localhost:3001';
  }

  return configured?.trim()?.replace(/\/+$/, '') || 'https://opspilot-frontend-zuxp.onrender.com';
}

/**
 * Resolves the backend OAuth callback URL dynamically.
 */
export function getOAuthCallbackUrl(
  provider: 'google' | 'github',
  configService: ConfigService,
  req?: any,
): string {
  const envKey = provider === 'google' ? 'GOOGLE_CALLBACK_URL' : 'GITHUB_CALLBACK_URL';
  const configured = configService.get<string>(envKey);
  if (
    configured &&
    configured.trim() &&
    !configured.includes('opspilot-backend-gd60.onrender.com')
  ) {
    return configured.trim();
  }

  const host = req?.headers?.['host'];
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    const port = host.split(':')[1] || '3000';
    return `http://localhost:${port}/v1/auth/${provider}/callback`;
  }

  return (
    configured?.trim() || `https://opspilot-backend-gd60.onrender.com/v1/auth/${provider}/callback`
  );
}
