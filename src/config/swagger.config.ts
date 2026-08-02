import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { registerAs } from '@nestjs/config';
import { SWAGGER_CONSTANTS } from '@shared/constants/swagger.constants';

export const swaggerConfig = registerAs('swagger', () => ({
  path: process.env.SWAGGER_PATH || 'api/docs',
  title: SWAGGER_CONSTANTS.TITLE,
  description: SWAGGER_CONSTANTS.DESCRIPTION,
  version: SWAGGER_CONSTANTS.VERSION,
}));

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const path = configService.get<string>('swagger.path') || 'api/docs';
  const title = configService.get<string>('swagger.title') || SWAGGER_CONSTANTS.TITLE;
  const description =
    configService.get<string>('swagger.description') || SWAGGER_CONSTANTS.DESCRIPTION;
  const version = configService.get<string>('swagger.version') || SWAGGER_CONSTANTS.VERSION;

  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(path, app, document);
}
