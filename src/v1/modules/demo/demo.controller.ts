import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../core/security/decorators/public.decorator';
import { AuthService } from '../auth/auth.service';
import { DemoSeedService } from './demo-seed.service';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';

/**
 * DemoController
 * Exposes the demo login endpoint. The endpoint is only reachable when
 * DEMO_MODE_ENABLED=true in the environment.
 *
 * All demo operations are clearly labeled in logs and API responses.
 */
@ApiTags('Demo Mode')
@Controller('auth')
export class DemoController {
  constructor(
    private readonly authService: AuthService,
    private readonly demoSeedService: DemoSeedService,
  ) {}

  /**
   * POST /v1/auth/demo-login
   *
   * Issues a short-lived JWT for an isolated demo session.
   * - Does NOT require a password or email verification
   * - Only works when DEMO_MODE_ENABLED=true
   * - Returned token contains isDemo=true in the JWT payload
   * - Demo user is restricted to the demo organization only
   */
  @Public()
  @Post('demo-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Instant demo login — returns a demo-scoped JWT (no credentials required)',
    description:
      'DEMO MODE only. Issues an access token for the pre-seeded isolated demo tenant. ' +
      'The token carries isDemo=true and grants no access to real customer data.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Demo token issued. Contains isDemo=true claim.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Demo mode is disabled on this server (DEMO_MODE_ENABLED not set).',
  })
  async demoLogin(): Promise<AuthResponseDto> {
    return this.authService.demoLogin(this.demoSeedService);
  }
}
