import { registerAs } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { APP_CONSTANTS } from '@shared/constants/app.constants';

export const loggerConfig = registerAs('logger', () => ({
  level: process.env.LOG_LEVEL || 'info',
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    genReqId: (req: IncomingMessage) => {
      const existingId = req.headers[APP_CONSTANTS.REQUEST_ID_HEADER];
      if (existingId) {
        return Array.isArray(existingId) ? existingId[0] : existingId;
      }
      return randomUUID();
    },
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    autoLogging: true,
    customProps: (req: IncomingMessage) => ({
      requestId: req.headers[APP_CONSTANTS.REQUEST_ID_HEADER],
    }),
  },
}));
