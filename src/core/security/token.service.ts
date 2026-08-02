import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  sid?: string;
  oid?: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-jwt-secret-opspilot',
      expiresIn: '15m',
    });
  }

  generateOpaqueRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-jwt-secret-opspilot',
    });
  }
}
