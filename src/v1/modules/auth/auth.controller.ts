import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import {
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  MessageResponseDto,
} from './dto/auth-flow.dto';
import { Public } from '../../../core/security/decorators/public.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GitHubAuthGuard } from './guards/github-auth.guard';
import { JwtPayload } from '../../../core/security/token.service';
import { getFrontendRedirectUrl } from './utils/auth-url.util';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account and dispatch verification email' })
  @ApiResponse({ status: HttpStatus.CREATED, type: MessageResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto): Promise<MessageResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials' })
  @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or unverified email',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using one-time token and issue session tokens' })
  @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthResponseDto> {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link sent to registered email' })
  @ApiResponse({ status: HttpStatus.OK, type: MessageResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using one-time token from email' })
  @ApiResponse({ status: HttpStatus.OK, type: MessageResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: HttpStatus.OK, type: AuthResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Token reuse detected or revoked' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto);
  }

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'Retrieve status of configured OAuth providers' })
  getProviders(): { google: boolean; github: boolean } {
    const googleId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const googleSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const githubId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const githubSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');

    return {
      google: Boolean(
        googleId &&
        googleSecret &&
        !googleId.includes('UNCONFIGURED') &&
        !googleId.includes('placeholder'),
      ),
      github: Boolean(
        githubId &&
        githubSecret &&
        !githubId.includes('UNCONFIGURED') &&
        !githubId.includes('placeholder'),
      ),
    };
  }

  // ─────────────────────────────────────────────
  // GOOGLE OAUTH ENDPOINTS
  // ─────────────────────────────────────────────
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 authentication flow' })
  async googleAuth(): Promise<void> {
    // Handled automatically by Passport Google strategy redirect or GoogleAuthGuard
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback endpoint' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    const authResult = await this.authService.validateOAuthUser(req.user);
    const frontendUrl = getFrontendRedirectUrl(req, this.configService);
    const redirectUrl = `${frontendUrl}/login?token=${encodeURIComponent(
      authResult.tokens.accessToken,
    )}&user=${encodeURIComponent(JSON.stringify(authResult.user))}`;
    res.redirect(redirectUrl);
  }

  // ─────────────────────────────────────────────
  // GITHUB OAUTH ENDPOINTS
  // ─────────────────────────────────────────────
  @Public()
  @Get('github')
  @UseGuards(GitHubAuthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth2 authentication flow' })
  async githubAuth(): Promise<void> {
    // Handled automatically by Passport GitHub strategy redirect or GitHubAuthGuard
  }

  @Public()
  @Get('github/callback')
  @UseGuards(GitHubAuthGuard)
  @ApiOperation({ summary: 'GitHub OAuth2 callback endpoint' })
  async githubAuthCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    const authResult = await this.authService.validateOAuthUser(req.user);
    const frontendUrl = getFrontendRedirectUrl(req, this.configService);
    const redirectUrl = `${frontendUrl}/login?token=${encodeURIComponent(
      authResult.tokens.accessToken,
    )}&user=${encodeURIComponent(JSON.stringify(authResult.user))}`;
    res.redirect(redirectUrl);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke active refresh tokens for authenticated user' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Successfully logged out' })
  async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.authService.logout(user.sub);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve current authenticated user context' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User context retrieved' })
  async getProfile(@CurrentUser() user: JwtPayload): Promise<{ user: JwtPayload }> {
    return { user };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update password for authenticated user' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.sub, body.currentPassword, body.newPassword);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve active sessions for authenticated user' })
  async getSessions(@CurrentUser() user: JwtPayload) {
    const sessions = await this.authService.getUserSessions(user.sub);
    return {
      message: 'Active sessions retrieved successfully',
      data: sessions,
    };
  }

  @Delete('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an active session' })
  async revokeSession(@CurrentUser() user: JwtPayload, @Param('sessionId') sessionId: string) {
    return this.authService.revokeSession(user.sub, sessionId);
  }

  @Delete('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all other active sessions' })
  async revokeAllOtherSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.revokeAllOtherSessions(user.sub, (user as any).sid);
  }
}
