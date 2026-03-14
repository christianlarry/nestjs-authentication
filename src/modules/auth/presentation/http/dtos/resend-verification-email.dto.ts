import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationEmailDto {
  @ApiProperty({
    description: 'Email address that will receive a new verification link.',
    example: 'user@example.com',
  })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
