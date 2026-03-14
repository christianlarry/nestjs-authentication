import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token sent to user email.',
    example: 'abcdef1234567890reset-token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'New password for account.',
    example: 'N3wStrongP@ssword!',
  })
  @IsString()
  @IsStrongPassword({}, { message: 'newPassword must be strong.' })
  @IsNotEmpty()
  newPassword: string;
}
