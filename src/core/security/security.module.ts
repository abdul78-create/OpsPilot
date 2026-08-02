import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HashService } from './hash.service';
import { TokenService } from './token.service';
import { AesSecretEncryptionService } from './aes-secret-encryption.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenantGuard } from './guards/tenant.guard';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-jwt-secret-opspilot',
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    HashService,
    TokenService,
    AesSecretEncryptionService,
    {
      provide: 'ISecretEncryptionProvider',
      useClass: AesSecretEncryptionService,
    },
    JwtAuthGuard,
    PermissionsGuard,
    TenantGuard,
  ],
  exports: [
    HashService,
    TokenService,
    AesSecretEncryptionService,
    'ISecretEncryptionProvider',
    JwtAuthGuard,
    PermissionsGuard,
    TenantGuard,
    JwtModule,
  ],
})
export class SecurityModule {}
