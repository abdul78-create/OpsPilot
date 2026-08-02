import { registerAs } from '@nestjs/config';
import { APP_CONSTANTS } from '@shared/constants/app.constants';

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || String(APP_CONSTANTS.DEFAULT_PORT), 10),
  apiPrefix: APP_CONSTANTS.API_PREFIX,
}));
