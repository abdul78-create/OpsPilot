import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token received via email' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Account email address to send reset link to' })
  @IsString()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ description: 'New password (minimum 8 characters)' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}
