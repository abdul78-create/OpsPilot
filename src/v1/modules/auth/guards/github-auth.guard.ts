import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { getFrontendRedirectUrl } from '../utils/auth-url.util';

@Injectable()
export class GitHubAuthGuard extends AuthGuard('github') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');
    const isConfigured = Boolean(
      clientId &&
      clientSecret &&
      !clientId.includes('UNCONFIGURED') &&
      !clientId.includes('placeholder'),
    );

    if (!isConfigured) {
      const response = context.switchToHttp().getResponse();
      const request = context.switchToHttp().getRequest();
      const frontendUrl = getFrontendRedirectUrl(request, this.configService);
      response.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(
          'GitHub OAuth is not configured on this instance. Please configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.',
        )}`,
      );
      return false;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'GitHub authentication failed');
    }
    return user;
  }
}
