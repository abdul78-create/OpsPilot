import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { getFrontendRedirectUrl } from '../utils/auth-url.util';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
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
        `${frontendUrl}/login/?error=${encodeURIComponent(
          'Google OAuth is not configured on this instance. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
        )}`,
      );
      return false;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Google authentication failed');
    }
    return user;
  }
}
