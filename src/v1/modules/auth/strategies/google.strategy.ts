import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { getOAuthCallbackUrl } from '../utils/auth-url.util';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientID =
      configService.get<string>('GOOGLE_CLIENT_ID') || 'UNCONFIGURED_GOOGLE_CLIENT_ID';
    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') || 'UNCONFIGURED_GOOGLE_CLIENT_SECRET';
    const callbackURL = getOAuthCallbackUrl('google', configService);

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails, photos } = profile;
    const email = emails?.[0]?.value ?? '';
    const avatarUrl = photos?.[0]?.value ?? null;

    const user = {
      provider: 'google',
      providerId: id,
      email,
      name: displayName || email.split('@')[0],
      avatarUrl,
    };

    done(null, user);
  }
}
