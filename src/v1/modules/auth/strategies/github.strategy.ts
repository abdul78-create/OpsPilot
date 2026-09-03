import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { getOAuthCallbackUrl } from '../utils/auth-url.util';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    const clientID =
      configService.get<string>('GITHUB_CLIENT_ID') || 'UNCONFIGURED_GITHUB_CLIENT_ID';
    const clientSecret =
      configService.get<string>('GITHUB_CLIENT_SECRET') || 'UNCONFIGURED_GITHUB_CLIENT_SECRET';
    const callbackURL = getOAuthCallbackUrl('github', configService);

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email', 'repo'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    const { id, username, displayName, emails, photos } = profile;
    const email = emails?.[0]?.value ?? `${username}@users.noreply.github.com`;
    const avatarUrl = photos?.[0]?.value ?? null;

    const user = {
      provider: 'github',
      providerId: id,
      email,
      name: displayName || username || email.split('@')[0],
      avatarUrl,
      accessToken,
    };

    done(null, user);
  }
}
