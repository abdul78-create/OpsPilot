import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidatePipelineYamlDto {
  @ApiProperty({
    example: `version: "1"
name: "Production CI/CD"
jobs:
  build:
    image: node:20-alpine
    commands:
      - npm ci
      - npm run build
  test:
    image: node:20-alpine
    needs: [build]
    commands:
      - npm test`,
    description: 'Raw .opspilot.yml YAML string to parse and validate',
  })
  @IsString()
  @IsNotEmpty()
  yamlConfig!: string;
}
