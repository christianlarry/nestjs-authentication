import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Account email to receive password reset token.',
    example: 'user@example.com',
  })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
