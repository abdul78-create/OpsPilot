import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QuarantineTestDto {
  @IsNotEmpty()
  @IsBoolean()
  isQuarantined: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
