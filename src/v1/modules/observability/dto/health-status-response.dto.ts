import { ApiProperty } from '@nestjs/swagger';

export class HealthStatusResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: '2026-07-30T15:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: { database: 'up', eventBus: 'up', queue: 'up' } })
  details!: {
    database: string;
    eventBus: string;
    queue: string;
  };
}
